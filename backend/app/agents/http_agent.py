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
import httpx

from app.agents.contract import AgentContext, AgentDecision, AgentUnavailable


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
            raise AgentUnavailable(str(e))
        if res.status_code != 200:
            raise AgentUnavailable(f"HTTP {res.status_code}")
        try:
            return AgentDecision.model_validate(res.json())
        except Exception as e:
            raise AgentUnavailable(f"invalid response: {e}")
