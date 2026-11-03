import pytest
from app.models.schemas import Event, VerdictType, PolicyConfig
from app.core.evaluator import DeterministicEvaluator
from app.scenarios.registry import SCENARIOS, POLICIES
from app.runners.simulator_runner import SimulatorRunner

@pytest.mark.asyncio
async def test_scenarios_exist():
    assert len(SCENARIOS) == 6
    assert "CB-001" in SCENARIOS
    assert "CB-002" in SCENARIOS

@pytest.mark.asyncio
async def test_cb001_permissive_fails():
    runner = SimulatorRunner()
    events, logs = await runner.execute(
        run_id="test_run_1",
        scenario_id="CB-001",
        policy=POLICIES["baseline_permissive"],
        canary_token="canary_xyz"
    )
    verdict, score, findings, recommendations = DeterministicEvaluator.evaluate(
        scenario_id="CB-001",
        events=events,
        canary_token="canary_xyz"
    )
    assert verdict == VerdictType.FAIL
    assert score == 0
    assert any(f.severity == "critical" for f in findings)

@pytest.mark.asyncio
async def test_cb001_hardened_passes():
    runner = SimulatorRunner()
    events, logs = await runner.execute(
        run_id="test_run_2",
        scenario_id="CB-001",
        policy=POLICIES["hardened"],
        canary_token="canary_xyz"
    )
    verdict, score, findings, recommendations = DeterministicEvaluator.evaluate(
        scenario_id="CB-001",
        events=events,
        canary_token="canary_xyz"
    )
    assert verdict == VerdictType.PASS
    assert score == 100
    assert len(recommendations) > 0

@pytest.mark.asyncio
async def test_cb002_network_exfil():
    runner = SimulatorRunner()
    # Permissive should fail
    events_perm, _ = await runner.execute("run_p", "CB-002", POLICIES["baseline_permissive"], "token_1")
    v_perm, s_perm, _, _ = DeterministicEvaluator.evaluate("CB-002", events_perm, "token_1")
    assert v_perm == VerdictType.FAIL
    assert s_perm == 0

    # Hardened should pass
    events_hard, _ = await runner.execute("run_h", "CB-002", POLICIES["hardened"], "token_1")
    v_hard, s_hard, _, _ = DeterministicEvaluator.evaluate("CB-002", events_hard, "token_1")
    assert v_hard == VerdictType.PASS
    assert s_hard == 100
