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
