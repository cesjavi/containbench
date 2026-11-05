"""
External HTTP agent.

Posts the scenario context to a user-supplied endpoint and expects a JSON body
`{"actions": [...], "reasoning": "..."}`. The response is validated against the
contract; anything off-contract is dropped. On any failure the caller falls back
to the reference agent, so a dead or misbehaving endpoint never breaks a run.

Request body (POST):
  {"scenario_id", "stimulus", "files": {path: content}, "tools": [...]}
Response body:
  {"actions": [{"type": "read_file", "path": "/secrets/canary.env"}, ...]}
"""
from typing import Optional
from urllib.parse import urlparse

import httpx
from pydantic import ValidationError

from app.agents.contract import AgentContext, AgentDecision, AgentUnavailable


def validate_agent_endpoint(endpoint: str) -> Optional[str]:
    """
    Returns why the endpoint is not acceptable, or None when it is. Agents usually live on
    localhost or a private network, so private addresses are allowed; set AGENT_ALLOWED_HOSTS
    to restrict which hosts the backend may call.
    """
    from app.agents.llm_agent import parse_llm_endpoint
    if parse_llm_endpoint(endpoint) is not None:
        return None  # built-in LLM agent alias, not a URL

    from app.config import settings
    url = urlparse(endpoint)
    if url.scheme not in ("http", "https") or not url.hostname:
        return "agent_endpoint must be an http(s) URL with a host"
    allowed = settings.agent_allowed_hosts
    if settings.DEMO_PUBLIC and not allowed:
        # With no login in front of the API, an open agent_endpoint would let anyone make the
        # backend call arbitrary URLs, including services on the VM itself.
        return ("External agent endpoints are disabled in the public demo. "
                "Leave the field empty to use the built-in reference agent.")
    if allowed and url.hostname.lower() not in allowed:
        return f"agent_endpoint host '{url.hostname}' is not in AGENT_ALLOWED_HOSTS"
    return None


class HttpAgent:
    is_external = True

    def __init__(self, endpoint: str, timeout: float = 15.0):
        self.endpoint = endpoint
        self.timeout = timeout
        self.name = f"http:{endpoint}"

    async def decide(self, ctx: AgentContext) -> AgentDecision:
        """
        Returns the agent's decision. A valid response with no actions is honored as
        "the agent chose not to act". Raises AgentUnavailable when the endpoint cannot
        be reached or returns an unusable response, so the caller can fall back.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(self.endpoint, json=ctx.model_dump())
        except Exception as e:
            raise AgentUnavailable(f"{type(e).__name__}: {e}")
        if res.status_code != 200:
            raise AgentUnavailable(f"HTTP {res.status_code}")
        # Error details never echo the response body: it lands in the run timeline, and the
        # endpoint may be an internal service the operator should not be able to read through us.
        try:
            payload = res.json()
        except ValueError:
            raise AgentUnavailable("invalid response: body is not JSON")
        try:
            return AgentDecision.model_validate(payload)
        except ValidationError as e:
            raise AgentUnavailable(f"invalid response: {e.error_count()} contract error(s)")
