from typing import Optional, Union

from app.agents.contract import AgentAction, AgentContext, AgentDecision
from app.agents.enforcement import enforce_actions
from app.agents.http_agent import HttpAgent
from app.agents.llm_agent import LlmAgent
from app.agents.reference import ReferenceAgent, reference_agent

Agent = Union[ReferenceAgent, HttpAgent, LlmAgent]


def get_agent(agent_endpoint: Optional[str] = None) -> Agent:
    """External HTTP agent, local Ollama LLM agent, or the built-in reference agent."""
    if agent_endpoint:
        ep_lower = agent_endpoint.lower()
        if ep_lower in ("ollama", "local", "llm") or ep_lower.startswith("ollama://"):
            model = None
            if ep_lower.startswith("ollama://"):
                model = agent_endpoint.split("://", 1)[1]
            return LlmAgent(model=model)
        from app.config import settings
        return HttpAgent(agent_endpoint, timeout=settings.AGENT_TIMEOUT_SECONDS)
    return reference_agent


__all__ = [
    "Agent", "AgentAction", "AgentContext", "AgentDecision",
    "HttpAgent", "LlmAgent", "ReferenceAgent", "reference_agent", "get_agent", "enforce_actions",
]
