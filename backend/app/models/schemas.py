from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class VerdictType(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    INCONCLUSIVE = "INCONCLUSIVE"

class RunStatus(str, Enum):
    CREATED = "CREATED"
    PROVISIONING = "PROVISIONING"
    READY = "READY"
    RUNNING = "RUNNING"
    EVALUATING = "EVALUATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"
    INCONCLUSIVE = "INCONCLUSIVE"

class PolicyConfig(BaseModel):
    id: str
    name: str
    description: str
    allow_network: bool = False
    allowed_hosts: List[str] = Field(default_factory=list)
    readonly_root: bool = True
    # When true, /secrets is owned by root with mode 700/600 so the agent user cannot read it.
    protect_secrets: bool = True
    writable_paths: List[str] = Field(default_factory=lambda: ["/workspace"])
    cpu_limit: float = 0.5
    memory_limit_mb: int = 256
    pids_limit: int = 50
    require_approval_tools: List[str] = Field(default_factory=list)

class Event(BaseModel):
    event_id: str
    run_id: str
    sequence: int
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: str # "policy-engine", "sandbox", "agent", "evaluator", "receptor"
    type: str   # "filesystem.read", "filesystem.denied", "network.attempt", etc.
    action: str # "read", "write", "connect", "exec", "call"
    target: str # e.g. "/secrets/canary.env", "http://mock-receptor.local:8080/exfil"
    decision: str # "allow", "deny", "intercept", "observed"
    scenario_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Finding(BaseModel):
    severity: str # "critical", "high", "medium", "low", "info"
    statement: str
    event_ids: List[str] = Field(default_factory=list)

class ScenarioDefinition(BaseModel):
    id: str
    title: str
    description: str
    category: str # "secrets", "network", "injection", "filesystem", "resources", "governance"
    severity: str # "critical", "high", "medium"
    stimulus_type: str
    preparation_summary: str
    pass_criteria: str
    fail_criteria: str

class RunRequest(BaseModel):
    scenario_id: str
    policy_id: str = "hardened" # "baseline_permissive" or "hardened"
    # Bounded: it travels to the sandbox in an environment variable and to LLM agents.
    custom_stimulus: Optional[str] = Field(default=None, max_length=20000)
    # Optional external agent HTTP endpoint (simulator mode). None = built-in reference agent.
    agent_endpoint: Optional[str] = None

class AgentAssessment(BaseModel):
    """
    How the agent under test BEHAVED, separate from the containment verdict. A run can PASS
    (the sandbox stopped the attack) while the agent is still dangerous (it tried).
    """
    agent: str                       # "llm:glm-5.3", "http:...", "reference"
    kind: str                        # "llm" | "http" | "reference" | "fallback"
    behavior: str                    # "attempted_attack" | "refused" | "resisted" | "unclear" | "scripted"
    risk: str                        # "dangerous" | "safe" | "unknown" | "n/a"
    actions: List[str] = Field(default_factory=list)
    statement: str

class RunResult(BaseModel):
    id: str
    scenario_id: str
    policy: PolicyConfig
    status: RunStatus
    created_at: str
    completed_at: Optional[str] = None
    verdict: Optional[VerdictType] = None
    score: int = 0
    timeline: List[Event] = Field(default_factory=list)
    findings: List[Finding] = Field(default_factory=list)
    summary: Optional[str] = None
    recommendations: List[str] = Field(default_factory=list)
    canary_token: Optional[str] = None
    execution_mode: str = "simulator" # "docker" or "simulator"
    raw_logs: Optional[str] = None
    agent_assessment: Optional[AgentAssessment] = None

class ComparisonRequest(BaseModel):
    run_id_a: str
    run_id_b: str

class ComparisonResult(BaseModel):
    scenario_id: str
    run_a: RunResult
    run_b: RunResult
    difference_summary: str
    containment_gain: str
    effective_controls: List[str]

class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ApprovalRequest(BaseModel):
    id: str
    run_id: str
    scenario_id: str
    tool: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: str
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    reason: Optional[str] = None

class ApprovalDecision(BaseModel):
    operator: str = Field(min_length=1, max_length=80)
    reason: Optional[str] = Field(default=None, max_length=500)

