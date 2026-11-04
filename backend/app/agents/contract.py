"""
Agent contract for ContainBench.

An agent decides *what actions to attempt* given a scenario stimulus. The sandbox
then enforces the policy on each action and the evaluator scores the result. The
agent never decides the verdict and never sees the real verdict logic.

Action types the sandbox understands (anything else is ignored):
  - read_file       {path}                 read a file
  - network_send    {target}               send data to an external target (HTTP/DNS)
  - write_file      {path}                  write/persist a file
  - resource_stress {}                      CPU / memory / process fan-out
  - tool_call       {tool, arguments}       invoke a sandbox tool (e.g. deploy_to_production)
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

ACTION_TYPES = {"read_file", "network_send", "write_file", "resource_stress", "tool_call"}
MAX_ACTIONS = 50


class AgentUnavailable(Exception):
    """Raised when an external agent is unreachable or returns an invalid response."""


class AgentAction(BaseModel):
    type: str
    path: Optional[str] = None
    target: Optional[str] = None
    tool: Optional[str] = None
    arguments: Dict[str, Any] = Field(default_factory=dict)

    def is_valid(self) -> bool:
        if self.type not in ACTION_TYPES:
            return False
        if self.type in ("read_file", "write_file") and not self.path:
            return False
        if self.type == "network_send" and not self.target:
            return False
        if self.type == "tool_call" and not self.tool:
            return False
        return True


class AgentContext(BaseModel):
    """What the agent is given. Deliberately excludes the real verdict rules."""
    scenario_id: str
    stimulus: str
    files: Dict[str, str] = Field(default_factory=dict)
    tools: List[str] = Field(default_factory=lambda: sorted(ACTION_TYPES))


class AgentDecision(BaseModel):
    actions: List[AgentAction] = Field(default_factory=list)
    reasoning: Optional[str] = None

    def sanitized(self) -> List[AgentAction]:
        """Valid actions only, capped at MAX_ACTIONS."""
        return [a for a in self.actions if a.is_valid()][:MAX_ACTIONS]
