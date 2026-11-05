from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["service"] == "containbench-control-api"

def test_scenarios_list():
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) == 6
    assert any(s["id"] == "CB-001" for s in scenarios)

def test_create_and_compare_runs():
    # Run permissive
    res_a = client.post("/api/runs", json={"scenario_id": "CB-001", "policy_id": "baseline_permissive"})
    assert res_a.status_code == 200
    run_a = res_a.json()
    assert run_a["verdict"] == "FAIL"

    # Run hardened
    res_b = client.post("/api/runs", json={"scenario_id": "CB-001", "policy_id": "hardened"})
    assert res_b.status_code == 200
    run_b = res_b.json()
    assert run_b["verdict"] == "PASS"

    # Compare
    res_comp = client.post("/api/runs/compare", json={"run_id_a": run_a["id"], "run_id_b": run_b["id"]})
    assert res_comp.status_code == 200
    comp = res_comp.json()
    assert "+100" in comp["containment_gain"]
    assert len(comp["effective_controls"]) > 0

    # Get Markdown Report
    res_rep = client.get(f"/api/runs/{run_b['id']}/report")
    assert res_rep.status_code == 200
    rep = res_rep.json()
    assert "# Containment Evaluation Report: CB-001" in rep["content"]
    assert "ContainBench Audit Report" in rep["content"]

def test_prompts_endpoint():
    res = client.get("/api/prompts")
    assert res.status_code == 200
    data = res.json()
    assert "system_prompts" in data
    assert "report" in data["system_prompts"]
    assert "scenario_stimuli" in data
    assert "CB-001" in data["scenario_stimuli"]



def test_orchestrator_plan_endpoint():
    res = client.post("/api/prompts/orchestrator", json={"scenario_id": "CB-003", "policy_id": "hardened"})
    assert res.status_code == 200
    plan = res.json()
    assert plan["status"] == "READY"
    assert plan["scenario_id"] == "CB-003"
    assert any(s["tool"] == "sandbox.plant_file" for s in plan["steps"])

def test_invalid_scenario_rejected():
    assert client.post("/api/prompts/orchestrator", json={"scenario_id": "CB-999"}).status_code == 400
    assert client.post("/api/runs", json={"scenario_id": "CB-999"}).status_code == 400


def test_invalid_policy_rejected():
    assert client.post("/api/runs", json={"scenario_id": "CB-001", "policy_id": "hardend"}).status_code == 400


def test_invalid_agent_endpoint_rejected():
    res = client.post("/api/runs", json={"scenario_id": "CB-001", "agent_endpoint": "file:///etc/passwd"})
    assert res.status_code == 400


def test_compare_rejects_mixed_scenarios_and_signs_gain():
    a = client.post("/api/runs", json={"scenario_id": "CB-001", "policy_id": "hardened"}).json()
    b = client.post("/api/runs", json={"scenario_id": "CB-001", "policy_id": "baseline_permissive"}).json()
    c = client.post("/api/runs", json={"scenario_id": "CB-002", "policy_id": "hardened"}).json()
    res = client.post("/api/runs/compare", json={"run_id_a": a["id"], "run_id_b": b["id"]})
    assert res.json()["containment_gain"].startswith("-")
    assert client.post("/api/runs/compare", json={"run_id_a": a["id"], "run_id_b": c["id"]}).status_code == 400


def test_demo_public_refuses_external_agent_urls(monkeypatch):
    from app.config import settings
    from app.agents.http_agent import validate_agent_endpoint
    monkeypatch.setattr(settings, "DEMO_PUBLIC", True)
    monkeypatch.setattr(settings, "AGENT_ALLOWED_HOSTS", "")
    assert validate_agent_endpoint("http://host.docker.internal:22/") is not None
    res = client.post("/api/runs", json={"scenario_id": "CB-001", "agent_endpoint": "http://10.0.0.1/act"})
    assert res.status_code == 400 and "public demo" in res.json()["detail"]
    assert validate_agent_endpoint("ollama") is None            # server-configured LLM agent
    # An explicit allowlist still works in the public demo.
    monkeypatch.setattr(settings, "AGENT_ALLOWED_HOSTS", "my-agent")
    assert validate_agent_endpoint("http://my-agent:9000/act") is None
    assert validate_agent_endpoint("http://other:9000/act") is not None


def test_custom_stimulus_is_bounded():
    res = client.post("/api/runs", json={"scenario_id": "CB-001", "custom_stimulus": "x" * 20001})
    assert res.status_code == 422


def test_compare_lists_controls_in_either_order():
    a = client.post("/api/runs", json={"scenario_id": "CB-001", "policy_id": "hardened"}).json()
    b = client.post("/api/runs", json={"scenario_id": "CB-001", "policy_id": "baseline_permissive"}).json()
    forward = client.post("/api/runs/compare", json={"run_id_a": b["id"], "run_id_b": a["id"]}).json()
    reverse = client.post("/api/runs/compare", json={"run_id_a": a["id"], "run_id_b": b["id"]}).json()
    assert "Secrets directory unreadable by the agent user" in forward["effective_controls"]
    assert reverse["effective_controls"] == forward["effective_controls"]
    assert "Run A is the contained one" in reverse["difference_summary"]
    same = client.post("/api/runs", json={"scenario_id": "CB-001", "policy_id": "hardened"}).json()
    equal = client.post("/api/runs/compare", json={"run_id_a": a["id"], "run_id_b": same["id"]}).json()
    assert equal["effective_controls"][0].startswith("Equivalent policies")


def test_prompt_endpoints_reject_unknown_policy():
    for path in ("/api/prompts/adversary", "/api/prompts/orchestrator"):
        res = client.post(path, json={"scenario_id": "CB-001", "policy_id": "hardend"})
        assert res.status_code == 400 and "Invalid policy" in res.json()["detail"]


def test_list_runs_is_bounded():
    for _ in range(3):
        client.post("/api/runs", json={"scenario_id": "CB-005", "policy_id": "hardened"})
    assert len(client.get("/api/runs", params={"limit": 2}).json()) == 2
    assert client.get("/api/runs", params={"limit": 0}).status_code == 422


def test_llm_agent_info_names_the_provider_without_leaking_the_url(monkeypatch):
    from app.api import routes
    from app.config import settings
    monkeypatch.setattr(settings, "LLM_AGENT_BASE_URL", "https://api.vultrinference.com/v1")
    monkeypatch.setattr(settings, "LLM_AGENT_MODEL", "qwen3.8-27b")
    assert routes.llm_agent_info() == {"model": "qwen3.8-27b", "provider": "vultr"}
    monkeypatch.setattr(settings, "LLM_AGENT_BASE_URL", "http://host.docker.internal:11434/v1")
    assert routes.llm_agent_info()["provider"] == "local"
