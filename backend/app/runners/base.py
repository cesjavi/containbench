import hashlib
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple, Optional
from app.models.schemas import Event, PolicyConfig


class BaseRunner(ABC):
    """Abstract interface for the sandbox execution engines."""

    @abstractmethod
    async def execute(
        self,
        run_id: str,
        scenario_id: str,
        policy: PolicyConfig,
        canary_token: str,
        stimulus: Optional[str] = None,
        stimulus_files: Optional[Dict[str, str]] = None,
        agent=None
    ) -> Tuple[List[Event], str]:
        """
        Runs the scenario, delivering `stimulus` (text) to the agent and planting
        `stimulus_files` (path -> content, only inside /workspace).
        When they are not given, the scenario's stimulus from prompts/scenarios/ is used.
        Returns:
        (list of normalized events, raw execution logs)
        """


class EventRecorder:
    """Builds sequential normalized events and the matching raw log lines."""

    def __init__(self, run_id: str, scenario_id: str):
        self.run_id = run_id
        self.scenario_id = scenario_id
        self.events: List[Event] = []
        self.raw_logs: List[str] = []

    def add(self, source: str, evt_type: str, action: str, target: str, decision: str, meta: Optional[Dict[str, Any]] = None) -> Event:
        seq = len(self.events) + 1
        now = datetime.now(timezone.utc).isoformat()
        evt = Event(
            event_id=f"evt_{self.run_id}_{seq:03d}",
            run_id=self.run_id,
            sequence=seq,
            timestamp=now,
            source=source,
            type=evt_type,
            action=action,
            target=target,
            decision=decision,
            scenario_id=self.scenario_id,
            metadata=meta or {}
        )
        self.events.append(evt)
        self.raw_logs.append(f"[{now}] [{source.upper()}] {evt_type.upper()} ({action}) -> {target} [{decision.upper()}]")
        return evt

    def log(self, line: str) -> None:
        self.raw_logs.append(line)

    def result(self) -> Tuple[List[Event], str]:
        return self.events, "\n".join(self.raw_logs)


def resolve_stimulus(
    run_id: str,
    scenario_id: str,
    canary_token: str,
    stimulus: Optional[str],
    stimulus_files: Optional[Dict[str, str]],
) -> Tuple[str, Dict[str, str]]:
    """Fills in the scenario's stimulus when the caller does not provide one."""
    if stimulus is not None and stimulus_files is not None:
        return stimulus, stimulus_files
    from app.core.prompt_manager import prompt_manager
    default = prompt_manager.build_scenario_stimulus(scenario_id, canary_token=canary_token, run_id=run_id)
    return (
        stimulus if stimulus is not None else default.text,
        stimulus_files if stimulus_files is not None else default.files,
    )


def stimulus_event_metadata(stimulus: str, files: Dict[str, str]) -> Dict[str, Any]:
    """Metadata of the delivered stimulus. Never includes the text (it may contain the canary)."""
    h = hashlib.sha256(stimulus.encode("utf-8"))
    for path in sorted(files):
        h.update(path.encode("utf-8"))
        h.update(files[path].encode("utf-8"))
    return {"sha256": h.hexdigest(), "chars": len(stimulus), "files": sorted(files)}


def record_stimulus_delivery(rec: EventRecorder, stimulus: str, files: Dict[str, str]) -> None:
    """Records the planted files and the delivery of the stimulus to the agent."""
    for path in sorted(files):
        rec.add("orchestrator", "stimulus.file_planted", "plant", path, "allow")
    rec.add("orchestrator", "stimulus.delivered", "deliver", "agent", "observed", stimulus_event_metadata(stimulus, files))
