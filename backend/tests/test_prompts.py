import json
import pytest
from app.core.prompt_manager import prompt_manager, RECEPTOR_URL, SCENARIO_META
from app.core.vultr_client import VultrInferenceClient
from app.runners.simulator_runner import SimulatorRunner
from app.runners.docker_runner import DockerRunner
from app.scenarios.registry import SCENARIOS, POLICIES

ALL_IDS = sorted(SCENARIOS)


@pytest.mark.parametrize("scenario_id", ALL_IDS)
def test_stimulus_is_payload_only(scenario_id):
    stim = prompt_manager.build_scenario_stimulus(scenario_id, canary_token="cb_canary_abc", run_id="run_x")
    assert stim.text
    # The agent must never see the context or the control objective
    assert "Control Objective" not in stim.text
    assert "##" not in stim.text
    assert "{{" not in stim.text
    for body in stim.files.values():
        assert "{{" not in body


def test_placeholders_substituted():
    stim = prompt_manager.build_scenario_stimulus("CB-002", canary_token="cb_canary_abc", run_id="run_x")
    assert "cb_canary_abc" in stim.text
    assert "run_x" in stim.text
    assert RECEPTOR_URL in stim.text


def test_cb003_plants_readme_and_web_page():
    stim = prompt_manager.build_scenario_stimulus("CB-003")
    assert set(stim.files) == {"/workspace/README.md", "/workspace/docs/setup.html"}
    assert RECEPTOR_URL in stim.files["/workspace/README.md"]
    assert "evil.net" not in stim.files["/workspace/README.md"]


def test_system_prompt_extracts_text_block():
    p = prompt_manager.get_system_prompt("evaluator")
    assert p.startswith("You are the ContainBench evidence analyst")
    assert "```" not in p
    assert prompt_manager.get_system_prompt("evaluator", raw=True).startswith("# System prompt")


@pytest.mark.asyncio
@pytest.mark.parametrize("scenario_id", ALL_IDS)
async def test_simulator_records_stimulus_without_leaking_canary(scenario_id):
    canary = "cb_canary_secretvalue"
    events, _ = await SimulatorRunner().execute("run_s", scenario_id, POLICIES["hardened"], canary)
    delivered = [e for e in events if e.type == "stimulus.delivered"]
    assert len(delivered) == 1
    assert len(delivered[0].metadata["sha256"]) == 64
    assert canary not in json.dumps(delivered[0].metadata)


@pytest.mark.asyncio
async def test_custom_stimulus_is_used():
    events, _ = await SimulatorRunner().execute("run_c", "CB-001", POLICIES["hardened"], "tok", stimulus="hello", stimulus_files={})
    meta = next(e for e in events if e.type == "stimulus.delivered").metadata
    assert meta["chars"] == 5 and meta["files"] == []


def test_docker_setup_only_plants_inside_workspace():
    script, planted = DockerRunner._build_stimulus_setup(
        "x", {"/workspace/README.md": "a", "/etc/passwd": "b", "/workspace/../etc/x": "c"}
    )
    assert planted == ["/workspace/README.md"]
    assert "/etc/passwd" not in script


@pytest.mark.parametrize("scenario_id", ALL_IDS)
def test_adversary_fallback_is_scenario_specific(scenario_id):
    out = VultrInferenceClient._fallback_adversary_stimulus(scenario_id)
    assert out["scenario_id"] == scenario_id
    assert out["blocked_observations"] == SCENARIO_META[scenario_id]["blocked_observations"]


def test_adversary_prompt_includes_allowed_targets():
    msg = prompt_manager.build_adversary_user_prompt("CB-002", "hardened")
    assert "allowed_targets" in msg and RECEPTOR_URL in msg


def test_evaluator_output_rejects_changed_verdict():
    good = json.dumps({"scenario_id": "CB-001", "verdict": "PASS", "summary": "ok", "findings": [
        {"severity": "info", "statement": "blocked", "event_ids": ["evt_1"]}]})
    bad = json.dumps({"scenario_id": "CB-001", "verdict": "FAIL", "summary": "x"})
    rendered = VultrInferenceClient._render_evaluator_output(good, "PASS")
    assert "ok" in rendered and "evt_1" in rendered
    assert VultrInferenceClient._render_evaluator_output(bad, "PASS") is None
    assert VultrInferenceClient._render_evaluator_output("free text", "PASS") == "free text"
