import uuid
from datetime import datetime, timezone
from typing import Any, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.schemas import (
    ScenarioDefinition,
    PolicyConfig,
    RunRequest,
    RunResult,
    RunStatus,
    ComparisonRequest,
    ComparisonResult,
    Event,
    ApprovalStatus,
    ApprovalRequest,
    ApprovalDecision,
    VerdictType,
)
from app.scenarios.registry import SCENARIOS, POLICIES
from app.core.approvals import approval_service
from app.core.store import store
from app.core.canary import generate_canary_token
from app.core.evaluator import DeterministicEvaluator
from app.core.tool_dispatcher import ToolDispatcher
from app.core.vultr_client import vultr_client
from app.core.prompt_manager import prompt_manager
from app.agents import get_agent
from app.agents.http_agent import validate_agent_endpoint
from app.agents.model_catalog import agent_models
from app.api.security import require_api_key, run_slot
from app.config import settings
from app.runners import get_runner

router = APIRouter(prefix="/api", dependencies=[Depends(require_api_key)])


def _run_status(events: List[Event]) -> RunStatus:
    """Terminal state of the run, from the sandbox lifecycle events."""
    if any(e.type == "sandbox.timeout" for e in events):
        return RunStatus.TIMED_OUT
    if any(e.type == "error" for e in events):
        return RunStatus.FAILED
    return RunStatus.COMPLETED


def _append_event(run: RunResult, source: str, evt_type: str, action: str, target: str,
                  decision: str, meta: Optional[Dict[str, Any]] = None) -> Event:
    """Appends an operator-side event to an existing run's timeline."""
    seq = len(run.timeline) + 1
    evt = Event(
        event_id=f"evt_{run.id}_{seq:03d}",
        run_id=run.id,
        sequence=seq,
        source=source,
        type=evt_type,
        action=action,
        target=target,
        decision=decision,
        scenario_id=run.scenario_id,
        metadata=meta or {}
    )
    run.timeline.append(evt)
    return evt

@router.get("/scenarios", response_model=List[ScenarioDefinition])
async def list_scenarios():
    """Returns the 6 built-in ContainBench scenarios."""
    return list(SCENARIOS.values())

@router.get("/scenarios/{scenario_id}", response_model=ScenarioDefinition)
async def get_scenario(scenario_id: str):
    if scenario_id not in SCENARIOS:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return SCENARIOS[scenario_id]

@router.get("/policies", response_model=List[PolicyConfig])
async def list_policies():
    """Returns the available policies (Permissive Baseline vs Hardened)."""
    return list(POLICIES.values())

@router.get("/vultr/status")
async def get_vultr_status():
    """Checks the status of Vultr Serverless Inference and says which LLM backs the agent under test."""
    status = dict(await vultr_client.check_health())
    status["agent"] = llm_agent_info()
    if status["agent"]["provider"] == "vultr":
        # Models the LLM agent can be switched to with "llm://<id>", Chinese LLMs first.
        status["agent"]["models"] = agent_models(status.get("models") or [])
    return status


def llm_agent_info() -> Dict[str, str]:
    """Model and provider of the built-in LLM agent; the base URL and key are never exposed."""
    base = settings.LLM_AGENT_BASE_URL.lower()
    provider = "vultr" if "vultrinference.com" in base else "local"
    return {"model": settings.LLM_AGENT_MODEL, "provider": provider}

@router.post("/runs", response_model=RunResult)
async def create_run(request: RunRequest):
    """
    Starts a new test run for a scenario under the chosen policy.
    Runs the sandbox, collects events, applies the deterministic evaluation and asks Vultr to explain it.
    """
    if request.scenario_id not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Invalid scenario: {request.scenario_id}")
    if request.policy_id not in POLICIES:
        # Never fall back silently: a typo must not run a different policy than the one asked for.
        raise HTTPException(status_code=400, detail=f"Invalid policy: {request.policy_id}")
    if request.agent_endpoint:
        problem = validate_agent_endpoint(request.agent_endpoint)
        if problem:
            raise HTTPException(status_code=400, detail=problem)

    policy = POLICIES[request.policy_id]
    run_id = f"run_{uuid.uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc).isoformat()
    canary = generate_canary_token()

    runner = get_runner()
    exec_mode = "docker" if "Docker" in runner.__class__.__name__ else "simulator"

    # Adversarial stimulus: the scenario's own (prompts/scenarios/) or a custom one.
    # Only the payload is delivered; the context and control objective never reach the agent.
    stimulus = prompt_manager.build_scenario_stimulus(request.scenario_id, canary_token=canary, run_id=run_id)
    stimulus_text = (
        prompt_manager.render_placeholders(request.custom_stimulus, canary_token=canary, run_id=run_id)
        if request.custom_stimulus else stimulus.text
    )

    agent = get_agent(request.agent_endpoint)

    async with run_slot():
        events, raw_logs = await runner.execute(
            run_id=run_id,
            scenario_id=request.scenario_id,
            policy=policy,
            canary_token=canary,
            stimulus=stimulus_text,
            stimulus_files=stimulus.files,
            agent=agent
        )

    # Every intercepted sensitive call becomes a pending request for a human operator
    for e in events:
        if e.type == "tool.approval_required":
            pending = approval_service.create_pending(run_id, request.scenario_id, e.target, e.metadata.get("arguments", {}))
            e.metadata["approval_id"] = pending.id

    # The verdict always comes from the deterministic evaluator
    verdict, score, findings, recommendations = DeterministicEvaluator.evaluate(
        scenario_id=request.scenario_id,
        events=events,
        canary_token=canary
    )

    # Explanation from Vultr Serverless Inference (prompts/evaluator-system.md)
    explanation = await vultr_client.generate_explanation(
        scenario_id=request.scenario_id,
        verdict=verdict.value,
        score=score,
        events=[e.model_dump() for e in events]
    )

    result = RunResult(
        id=run_id,
        scenario_id=request.scenario_id,
        policy=policy,
        status=_run_status(events),
        created_at=created_at,
        completed_at=datetime.now(timezone.utc).isoformat(),
        verdict=verdict,
        score=score,
        timeline=events,
        findings=findings,
        summary=explanation,
        recommendations=recommendations,
        canary_token=canary,
        execution_mode=exec_mode,
        raw_logs=raw_logs
    )

    store.put_run(result)
    return result

@router.get("/runs", response_model=List[RunResult])
async def list_runs(limit: int = Query(default=100, ge=1, le=500)):
    """Returns the most recent runs, newest first (each one carries its full timeline and logs)."""
    return store.list_runs(limit)

@router.get("/runs/{run_id}", response_model=RunResult)
async def get_run(run_id: str):
    run = store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run

@router.post("/runs/compare", response_model=ComparisonResult)
async def compare_runs(req: ComparisonRequest):
    """
    Compares two runs (the A/B demo story):
    shows how the blast radius shrank and which controls made the difference.
    """
    run_a = store.get_run(req.run_id_a)
    run_b = store.get_run(req.run_id_b)
    if run_a is None or run_b is None:
        raise HTTPException(status_code=404, detail="One or both runs do not exist")
    if run_a.scenario_id != run_b.scenario_id:
        raise HTTPException(status_code=400, detail="Both runs must belong to the same scenario")

    # Whichever run was contained is the "strong" one, so the order of A and B does not matter.
    contained, exposed = None, None
    if run_b.verdict == VerdictType.PASS and run_a.verdict != VerdictType.PASS:
        contained, exposed = run_b, run_a
    elif run_a.verdict == VerdictType.PASS and run_b.verdict != VerdictType.PASS:
        contained, exposed = run_a, run_b

    effective_controls = []
    if contained is not None:
        strong, weak = contained.policy, exposed.policy
        if not strong.allow_network and weak.allow_network:
            effective_controls.append("Network isolation (egress denied)")
        if strong.readonly_root and not weak.readonly_root:
            effective_controls.append("Read-only root filesystem (--read-only)")
        if strong.protect_secrets and not weak.protect_secrets:
            effective_controls.append("Secrets directory unreadable by the agent user")
        if set(strong.require_approval_tools) - set(weak.require_approval_tools):
            effective_controls.append("Mandatory human-in-the-loop on sensitive tools")
        if (strong.pids_limit < weak.pids_limit or strong.memory_limit_mb < weak.memory_limit_mb
                or strong.cpu_limit < weak.cpu_limit):
            effective_controls.append("Resource containment through cgroups (CPU / PIDs / memory limit)")

    if not effective_controls:
        if run_a.policy.model_dump(exclude={"id", "name", "description"}) == \
                run_b.policy.model_dump(exclude={"id", "name", "description"}):
            effective_controls.append("Equivalent policies: no control differs between the two runs.")
        elif contained is None:
            effective_controls.append("Both runs reached the same containment outcome; "
                                      "the policy differences did not change it.")
        else:
            effective_controls.append("No listed control explains the difference in outcome.")

    diff_summary = (
        f"Run '{run_a.policy.name}' got {run_a.verdict} ({run_a.score}/100), while "
        f"'{run_b.policy.name}' got {run_b.verdict} ({run_b.score}/100)."
    )
    if contained is run_a:
        diff_summary += " Run A is the contained one, so the gain is negative."

    gain = f"{run_b.score - run_a.score:+d} containment points"

    return ComparisonResult(
        scenario_id=run_b.scenario_id,
        run_a=run_a,
        run_b=run_b,
        difference_summary=diff_summary,
        containment_gain=gain,
        effective_controls=effective_controls
    )

@router.get("/prompts")
async def list_prompts():
    """Returns the system prompts and the stimulus document of each scenario."""
    return {
        "system_prompts": {
            "adversary": prompt_manager.get_system_prompt("adversary", raw=True),
            "orchestrator": prompt_manager.get_system_prompt("orchestrator", raw=True),
            "evaluator": prompt_manager.get_system_prompt("evaluator", raw=True),
            "report": prompt_manager.get_system_prompt("report", raw=True),
        },
        # Full document for operators (includes the control objective).
        "scenario_stimuli": {
            sc_id: prompt_manager.get_scenario_document(sc_id) for sc_id in SCENARIOS
        }
    }

@router.get("/runs/{run_id}/report")
async def get_run_report(run_id: str):
    """Generates the final security report in Markdown."""
    run = store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    report_md = await vultr_client.generate_report_markdown(run)
    return {
        "run_id": run_id,
        "format": "markdown",
        "content": report_md
    }

def _scenario_and_policy(payload: Dict[str, str]):
    """Validates both ids, like create_run: an unknown policy is an error, never a silent default."""
    scenario_id = payload.get("scenario_id", "CB-001")
    if scenario_id not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Invalid scenario: {scenario_id}")
    policy_id = payload.get("policy_id", "hardened")
    if policy_id not in POLICIES:
        raise HTTPException(status_code=400, detail=f"Invalid policy: {policy_id}")
    return scenario_id, POLICIES[policy_id]

@router.post("/prompts/adversary")
async def generate_adversary_prompt(payload: Dict[str, str]):
    """Generates a custom adversarial stimulus with Vultr Inference (prompts/adversary-system.md)."""
    scenario_id, policy = _scenario_and_policy(payload)
    return await vultr_client.generate_adversary_stimulus(scenario_id, policy.id)

@router.post("/prompts/orchestrator")
async def generate_execution_plan(payload: Dict[str, str]):
    """
    Generates a bounded execution plan with prompts/orchestrator-system.md.
    The plan is advisory and auditable: runners never execute model-proposed steps.
    """
    scenario_id, policy = _scenario_and_policy(payload)
    sandbox_id = f"sbx_{uuid.uuid4().hex[:8]}"
    return await vultr_client.generate_execution_plan(scenario_id, policy, sandbox_id)

@router.get("/approvals", response_model=List[ApprovalRequest])
async def list_approvals(status: Optional[ApprovalStatus] = None):
    """Sensitive tool calls held for human review, newest first."""
    return approval_service.list(status)

def _decide(approval_id: str, approve: bool, body: ApprovalDecision) -> Dict[str, Any]:
    pending = approval_service.get(approval_id)
    if pending is None:
        raise HTTPException(status_code=404, detail="Approval request not found")
    run = store.get_run(pending.run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="The run for this approval no longer exists")
    try:
        decided = approval_service.decide(approval_id, approve, body.operator, body.reason or "")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    if not approve:
        _append_event(run, "operator", "tool.approval_rejected", "review", decided.tool, "deny",
                      {"approval_id": decided.id, "operator": body.operator, "reason": body.reason})
        store.put_run(run)
        return {"approval": decided, "run": run}

    _append_event(run, "operator", "tool.approval_granted", "review", decided.tool, "allow",
                  {"approval_id": decided.id, "operator": body.operator, "reason": body.reason})
    # The signed token stays server-side: the dispatcher verifies it against the exact call.
    token = approval_service.issue_token(decided.id)
    result = ToolDispatcher(run.policy).dispatch(decided.tool, decided.arguments, approval_token=token)
    _append_event(run, "policy-engine", result.event_type, "call", result.tool, result.decision,
                  {**result.metadata, "approval_id": decided.id})
    store.put_run(run)
    return {"approval": decided, "run": run}

@router.post("/approvals/{approval_id}/approve")
async def approve_tool_call(approval_id: str, body: ApprovalDecision):
    """
    A human operator approves a held call. The simulated tool then runs with a signed token.
    The run's deterministic verdict is not recomputed: an approved execution is not a bypass.
    """
    return _decide(approval_id, True, body)

@router.post("/approvals/{approval_id}/reject")
async def reject_tool_call(approval_id: str, body: ApprovalDecision):
    """A human operator rejects a held call; the tool never runs."""
    return _decide(approval_id, False, body)
