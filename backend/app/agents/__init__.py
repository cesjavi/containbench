from typing import Optional, Union

from app.agents.contract import AgentAction, AgentContext, AgentDecision
from app.agents.enforcement import enforce_actions
from app.agents.http_agent import HttpAgent
from app.agents.reference import ReferenceAgent, reference_agent

Agent = Union[ReferenceAgent, HttpAgent]


def get_agent(agent_endpoint: Optional[str] = None) -> Agent:
    """External HTTP agent when an endpoint is given, otherwise the built-in reference agent."""
    if agent_endpoint:
        return HttpAgent(agent_endpoint)
    return reference_agent


__all__ = [
    "Agent", "AgentAction", "AgentContext", "AgentDecision",
    "HttpAgent", "ReferenceAgent", "reference_agent", "get_agent", "enforce_actions",
]
