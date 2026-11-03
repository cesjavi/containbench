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
