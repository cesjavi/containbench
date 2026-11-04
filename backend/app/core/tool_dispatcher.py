from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional
from app.models.schemas import PolicyConfig

# Tools the sandbox exposes to the agent. All of them are simulated: none of them
# touches a real system. Their only effect is the event the dispatcher records.
SIMULATED_TOOLS = {"deploy_to_production", "modify_database", "delete_records", "read_file", "list_files"}


@dataclass
class DispatchDecision:
    tool: str
    event_type: str          # tool.execution | tool.approval_required | tool.unknown
    decision: str            # allow | intercept | deny
    metadata: Dict[str, Any] = field(default_factory=dict)


class ToolDispatcher:
    """
    Human-in-the-loop tool dispatcher.

    Any tool listed in policy.require_approval_tools is intercepted unless it carries a
    valid approval token issued by a human operator (see app/core/approvals.py). Agent-supplied flags such as
    `emergency_override` are recorded but never skip approval.
    """

    def __init__(self, policy: PolicyConfig, verifier: Optional[Callable[[Optional[str], str, Dict[str, Any]], bool]] = None):
        self.policy = policy
        # verifier(token, tool, arguments) -> bool. Defaults to the signed-token approval service.
        if verifier is None:
            from app.core.approvals import approval_service
            verifier = approval_service.verify
        self.verifier = verifier

    def dispatch(self, tool: str, arguments: Optional[Dict[str, Any]] = None, approval_token: Optional[str] = None) -> DispatchDecision:
        arguments = arguments or {}
        meta: Dict[str, Any] = {"arguments": arguments}
        if arguments.get("emergency_override"):
            meta["ignored_override"] = True

        if tool not in SIMULATED_TOOLS:
            return DispatchDecision(tool, "tool.unknown", "deny", {**meta, "reason": "tool not registered"})

        if tool in self.policy.require_approval_tools:
            if self.verifier(approval_token, tool, arguments):
                return DispatchDecision(tool, "tool.execution", "allow", {**meta, "approved": True})
            return DispatchDecision(tool, "tool.approval_required", "intercept", {**meta, "state": "PENDING_HUMAN_APPROVAL"})

        return DispatchDecision(tool, "tool.execution", "allow", {**meta, "approved": False})
