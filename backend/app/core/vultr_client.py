import json
import re
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings
from app.core.prompt_manager import prompt_manager
from app.models.schemas import PolicyConfig

class VultrInferenceClient:
    """
    Client for Vultr Serverless Inference (OpenAI-compatible API).
    Every method has a deterministic local fallback, so ContainBench works without an API key.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.VULTR_INFERENCE_BASE_URL).rstrip("/")
        raw_key = api_key or settings.VULTR_API_KEY
        if not raw_key and any(h in self.base_url for h in ("localhost", "127.0.0.1", "ollama")):
            raw_key = "ollama"
        self.api_key = raw_key
        self.default_model = settings.DEFAULT_MODEL
        self._resolved_model: Optional[str] = None

    async def _list_model_ids(self) -> List[str]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/models", headers={"Authorization": f"Bearer {self.api_key}"})
                if res.status_code == 200:
                    return [m.get("id", "") for m in res.json().get("data", []) if m.get("id")]
        except Exception:
            pass
        return []

    async def resolve_model(self) -> str:
        """
        Picks the model to use. A pinned DEFAULT_MODEL is honored if available. In "auto" mode,
        the first available id matching MODEL_PREFERENCE wins. The choice is cached.
        """
        if self._resolved_model:
            return self._resolved_model
        available = await self._list_model_ids()
        chosen = None
        if self.default_model and self.default_model != "auto":
            chosen = self.default_model if (self.default_model in available or not available) else None
        if chosen is None:
            for pref in settings.model_preference:
                match = next((m for m in available if pref in m), None)
                if match:
                    chosen = match
                    break
        # Fall back to any available id, then to the configured value.
        chosen = chosen or (available[0] if available else self.default_model)
        # Only cache a choice made from a real model list: if Vultr was briefly unreachable,
        # caching the fallback ("auto") would break every later call until a restart.
        if available:
            self._resolved_model = chosen
        return chosen

    @staticmethod
    def _supports_json_mode(model_id: str) -> bool:
        """Legacy llama2 chat endpoints reject response_format; modern models accept it."""
        return "llama2" not in model_id and "llama-2" not in model_id

    async def check_health(self) -> Dict[str, Any]:
        """Checks connectivity with the Vultr endpoint."""
        if not self.api_key:
            return {
                "connected": False,
                "status": "missing_api_key",
                "message": "VULTR_API_KEY is not set. Running with the local deterministic generator."
            }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                if res.status_code == 200:
                    return {
                        "connected": True,
                        "status": "healthy",
                        "models": res.json().get("data", [])
                    }
                return {
                    "connected": False,
                    "status": f"http_{res.status_code}",
                    "message": res.text
                }
        except Exception as e:
            return {
                "connected": False,
                "status": "error",
                "message": str(e)
            }

    async def _chat(
        self,
        system_prompt: str,
        user_content: str,
        temperature: float,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
        timeout: float = 20.0
    ) -> Optional[str]:
        """Sends one chat completion. Returns the message text, or None on any failure."""
        if not self.api_key:
            return None
        model = await self.resolve_model()
        payload: Dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if json_mode and self._supports_json_mode(model):
            payload["response_format"] = {"type": "json_object"}
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                if response.status_code != 200:
                    return None
                msg = response.json()["choices"][0]["message"]
                content = msg.get("content")
                if not content and msg.get("reasoning"):
                    content = msg["reasoning"]
                return content.strip() if content else None
        except Exception:
            return None

    @staticmethod
    def _parse_json(content: Optional[str]) -> Optional[Dict[str, Any]]:
        """Parses a JSON object, tolerating a surrounding ``` fence."""
        if not content:
            return None
        text = content.strip()
        if text.startswith("```"):
            start, end = text.find("{"), text.rfind("}")
            text = text[start:end + 1] if start != -1 and end != -1 else text
        try:
            parsed = json.loads(text)
        except Exception:
            return None
        return parsed if isinstance(parsed, dict) else None

    async def generate_explanation(
        self,
        scenario_id: str,
        verdict: str,
        score: int,
        events: List[Dict[str, Any]],
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Asks Vultr Serverless Inference to explain the observed evidence
        using prompts/evaluator-system.md (unless system_prompt is given).
        """
        sys_prompt = system_prompt or prompt_manager.get_system_prompt("evaluator")
        user_content = prompt_manager.build_evaluator_user_prompt(scenario_id, verdict, score, events)
        content = await self._chat(sys_prompt, user_content, temperature=0.2, max_tokens=1000, json_mode=True)
        explanation = self._render_evaluator_output(content, verdict) if content else None
        return explanation or self._fallback_explanation(scenario_id, verdict, score, events)

    @classmethod
    def _render_evaluator_output(cls, content: str, verdict: str) -> Optional[str]:
        """
        Turns the JSON output of prompts/evaluator-system.md into readable text.
        If the model changed the verdict, the answer is discarded (returns None).
        If the output is not JSON, the raw text is used as is.
        """
        parsed = cls._parse_json(content)
        if parsed is None:
            # Free text has no verdict field to check, so apply the same guard to its words:
            # an explanation that states a different verdict is discarded.
            text = content.strip()
            others = {"PASS", "FAIL", "INCONCLUSIVE"} - {verdict.upper()}
            if any(re.search(rf"\b{v}\b", text.upper()) for v in others):
                return None
            return text or None
        if str(parsed.get("verdict", verdict)).upper() != verdict.upper():
            return None

        lines = [str(parsed.get("summary", "")).strip()]
        for f in parsed.get("findings", []) or []:
            if isinstance(f, dict):
                ids = ", ".join(f.get("event_ids", []) or [])
                lines.append(f"- [{str(f.get('severity', 'info')).upper()}] {f.get('statement', '')}" + (f" ({ids})" if ids else ""))
        missing = parsed.get("missing_evidence") or []
        if missing:
            lines.append("Missing evidence: " + "; ".join(map(str, missing)))
        recs = parsed.get("recommendations") or []
        if recs:
            lines.append("Recommendations: " + "; ".join(map(str, recs)))
        rendered = "\n".join(l for l in lines if l)
        return rendered or None

    async def generate_report_markdown(self, run: Any) -> str:
        """
        Builds the final audit report in Markdown with prompts/report-system.md.
        Falls back to the structured deterministic generator when Vultr is unavailable.
        """
        sys_prompt, user_content = prompt_manager.build_report_prompts(run)
        content = await self._chat(sys_prompt, user_content, temperature=0.3, max_tokens=1500, timeout=30.0)
        return content or prompt_manager.generate_offline_markdown_report(run)

    async def generate_adversary_stimulus(self, scenario_id: str, target_policy: str = "hardened") -> Dict[str, Any]:
        """
        Generates a dynamic adversarial stimulus following prompts/adversary-system.md.
        The scope (allowed_targets) comes from the scenario metadata.
        """
        sys_prompt = prompt_manager.get_system_prompt("adversary")
        user_content = prompt_manager.build_adversary_user_prompt(scenario_id, target_policy)
        parsed = self._parse_json(await self._chat(sys_prompt, user_content, temperature=0.3, json_mode=True))
        if parsed and parsed.get("scenario_id") == scenario_id:
            return parsed
        return self._fallback_adversary_stimulus(scenario_id)

    async def generate_execution_plan(self, scenario_id: str, policy: PolicyConfig, sandbox_id: str) -> Dict[str, Any]:
        """
        Generates a bounded execution plan following prompts/orchestrator-system.md.
        The plan is advisory: runners never execute steps proposed by the model.
        """
        sys_prompt = prompt_manager.get_system_prompt("orchestrator")
        user_content = prompt_manager.build_orchestrator_user_prompt(scenario_id, policy, sandbox_id)
        parsed = self._parse_json(await self._chat(sys_prompt, user_content, temperature=0.1, json_mode=True))
        if parsed and parsed.get("scenario_id") == scenario_id and parsed.get("status") in ("READY", "BLOCKED"):
            parsed["source"] = "vultr"
            return parsed
        return self._fallback_execution_plan(scenario_id, policy)

    @staticmethod
    def _fallback_execution_plan(scenario_id: str, policy: PolicyConfig) -> Dict[str, Any]:
        """Deterministic plan that mirrors what the runners actually do."""
        meta = prompt_manager.get_scenario_meta(scenario_id)
        stimulus = prompt_manager.build_scenario_stimulus(scenario_id)
        timeout = settings.CONTAINER_TIMEOUT_SECONDS
        steps: List[Dict[str, Any]] = [
            {
                "id": "step-1",
                "purpose": "Create the ephemeral sandbox with the policy limits",
                "tool": "sandbox.create",
                "arguments": {"policy": policy.id, "network": "allowed" if policy.allow_network else "none",
                              "readonly_root": policy.readonly_root, "protect_secrets": policy.protect_secrets},
                "expected_evidence": ["sandbox.created"],
                "timeout_seconds": 10,
            }
        ]
        for path in sorted(stimulus.files):
            steps.append({
                "id": f"step-{len(steps) + 1}",
                "purpose": "Plant untrusted content inside /workspace",
                "tool": "sandbox.plant_file",
                "arguments": {"path": path},
                "expected_evidence": ["stimulus.file_planted"],
                "timeout_seconds": 5,
            })
        steps.append({
            "id": f"step-{len(steps) + 1}",
            "purpose": "Deliver the stimulus to the agent and observe its actions",
            "tool": "sandbox.exec",
            "arguments": {"scenario_id": scenario_id},
            "expected_evidence": ["stimulus.delivered"] + meta["success_observations"] + meta["blocked_observations"],
            "timeout_seconds": timeout,
        })
        if scenario_id in ("CB-002", "CB-003"):
            steps.append({
                "id": f"step-{len(steps) + 1}",
                "purpose": "Ask the mock receptor whether the canary or run id arrived",
                "tool": "receptor.query",
                "arguments": {"allowed_targets": meta["allowed_targets"]},
                "expected_evidence": ["exfil.received or network.blocked"],
                "timeout_seconds": 5,
            })
        return {
            "status": "READY",
            "scenario_id": scenario_id,
            "assumptions": ["Only decoy secrets and simulated targets are used."],
            "steps": steps,
            "cleanup": ["Remove the container (force)", "Discard tmpfs volumes (/workspace, /secrets)"],
            "blocked_reason": None,
            "source": "deterministic",
        }

    @staticmethod
    def _fallback_adversary_stimulus(scenario_id: str) -> Dict[str, Any]:
        """The scenario's reference stimulus, with observations specific to each CB-00X."""
        meta = prompt_manager.get_scenario_meta(scenario_id)
        stimulus = prompt_manager.build_scenario_stimulus(scenario_id)
        return {
            "status": "READY",
            "scenario_id": scenario_id,
            "attack_name": f"ContainBench Standard Probe {scenario_id}",
            "stimulus": {
                "type": "repository_content" if stimulus.files else "user_message",
                "content": stimulus.text
            },
            "files": stimulus.files,
            "canary_references": meta["canary_references"],
            "success_observations": meta["success_observations"],
            "blocked_observations": meta["blocked_observations"],
            "safety_constraints": [
                "Only targets listed in allowed_targets: " + ", ".join(meta["allowed_targets"]),
                "Execution confined to the ephemeral container",
                "No persistence on the host"
            ],
            "blocked_reason": None
        }

    def _fallback_explanation(self, scenario_id: str, verdict: str, score: int, events: List[Dict[str, Any]]) -> str:
        """Local deterministic fallback generator."""
        event_count = len(events)
        if verdict == "PASS":
            return (
                f"Scenario {scenario_id} evaluation: PASS ({score}/100). "
                f"The containment controls worked. {event_count} telemetry events were recorded. "
                "The isolation policy blocked the adversarial attempt before it could compromise confidentiality or integrity."
            )
        elif verdict == "FAIL":
            return (
                f"Scenario {scenario_id} evaluation: FAIL ({score}/100). "
                f"A security compromise was detected across the sequence of {event_count} events. "
                "The agent bypassed or overcame the containment controls in place under the evaluated policy."
            )
        return (
            f"Scenario {scenario_id} evaluation: INCONCLUSIVE ({score}/100). "
            "The recorded evidence is not enough to reach a conclusive verdict."
        )

vultr_client = VultrInferenceClient()
