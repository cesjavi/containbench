import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import settings
from app.models.schemas import ApprovalRequest, ApprovalStatus


class ApprovalService:
    """
    Human-in-the-loop approvals for sensitive tools.

    When the dispatcher intercepts a call, a PENDING request is stored. A human operator
    approves or rejects it through the API. Approval issues an HMAC-signed token bound to
    the exact tool and arguments, so it cannot be replayed for a different call.
    """

    def __init__(self, store=None, secret: Optional[str] = None):
        if store is None:
            from app.core.store import store as default_store
            store = default_store
        self._store = store
        # Without a configured secret, tokens are only valid for the life of this process.
        self._secret = (secret or settings.APPROVAL_SECRET or secrets.token_hex(32)).encode("utf-8")

    @staticmethod
    def _canonical(tool: str, arguments: Dict[str, Any]) -> str:
        return json.dumps({"tool": tool, "arguments": arguments}, sort_keys=True, separators=(",", ":"), default=str)

    def _sign(self, approval_id: str, tool: str, arguments: Dict[str, Any]) -> str:
        message = f"{approval_id}|{self._canonical(tool, arguments)}".encode("utf-8")
        return f"{approval_id}.{hmac.new(self._secret, message, hashlib.sha256).hexdigest()}"

    def create_pending(self, run_id: str, scenario_id: str, tool: str, arguments: Dict[str, Any]) -> ApprovalRequest:
        request = ApprovalRequest(
            id=f"apr_{uuid.uuid4().hex[:10]}",
            run_id=run_id,
            scenario_id=scenario_id,
            tool=tool,
            arguments=arguments,
            status=ApprovalStatus.PENDING,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self._store.put_approval(request)
        return request

    def list(self, status: Optional[ApprovalStatus] = None) -> List[ApprovalRequest]:
        return self._store.list_approvals(status.value if status else None)

    def get(self, approval_id: str) -> Optional[ApprovalRequest]:
        return self._store.get_approval(approval_id)

    def decide(self, approval_id: str, approve: bool, operator: str, reason: str = "") -> ApprovalRequest:
        request = self._store.get_approval(approval_id)
        if request is None:
            raise KeyError(approval_id)
        if request.status != ApprovalStatus.PENDING:
            raise ValueError(f"Approval {approval_id} is already {request.status.value}")
        request.status = ApprovalStatus.APPROVED if approve else ApprovalStatus.REJECTED
        request.decided_by = operator
        request.decided_at = datetime.now(timezone.utc).isoformat()
        request.reason = reason or None
        self._store.put_approval(request)
        return request

    def issue_token(self, approval_id: str) -> str:
        """Token for an APPROVED request. Only the server ever sees it; it is never sent to the agent."""
        request = self._store.get_approval(approval_id)
        if request is None or request.status != ApprovalStatus.APPROVED:
            raise ValueError("Only approved requests get a token")
        return self._sign(request.id, request.tool, request.arguments)

    def verify(self, token: Optional[str], tool: str, arguments: Dict[str, Any]) -> bool:
        """True only for a token signed for this exact tool + arguments, on an APPROVED request."""
        if not token or "." not in token:
            return False
        approval_id = token.split(".", 1)[0]
        request = self._store.get_approval(approval_id)
        if request is None or request.status != ApprovalStatus.APPROVED:
            return False
        return hmac.compare_digest(token, self._sign(approval_id, tool, arguments))


approval_service = ApprovalService()
