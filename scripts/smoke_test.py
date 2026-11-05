#!/usr/bin/env python3
"""
ContainBench deployment smoke test.

Drives a running ContainBench API over HTTP and checks the end-to-end path:
the six scenarios under both policies, the CB-006 human-approval flow, and the
Markdown report. Use it to validate a Vultr VM (docker mode) or a local backend.

    python3 scripts/smoke_test.py
    CONTAINBENCH_URL=http://localhost:8000 CONTAINBENCH_API_KEY=... python3 scripts/smoke_test.py

Exit code 0 = every check passed. Stdlib only, so it runs anywhere python3 does.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("CONTAINBENCH_URL", "http://localhost:8000").rstrip("/")
API_KEY = os.environ.get("CONTAINBENCH_API_KEY", "")
SCENARIOS = ["CB-001", "CB-002", "CB-003", "CB-004", "CB-005", "CB-006"]

# Expected verdicts. Under docker mode CB-001/CB-002 may be INCONCLUSIVE if the
# canary or receptor are not wired, so permissive FAIL is only required where the
# attack is self-contained; hardened must never FAIL.
EXPECT_PERMISSIVE_FAIL = {"CB-003", "CB-004", "CB-005", "CB-006"}


def _request(method, path, payload=None):
    url = f"{BASE}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if API_KEY:
        req.add_header("X-API-Key", API_KEY)
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


class Report:
    def __init__(self):
        self.failures = []

    def check(self, ok, label):
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {label}")
        if not ok:
            self.failures.append(label)
        return ok


def _wait_for_backend(seconds=60):
    """Right after `docker compose up` the port accepts connections before uvicorn is ready."""
    deadline = time.monotonic() + seconds
    while True:
        try:
            return _request("GET", "/health")
        except (urllib.error.URLError, ConnectionError, OSError):
            if time.monotonic() >= deadline:
                raise
            time.sleep(2)


def run(report):
    status, health = _wait_for_backend()
    report.check(status == 200, f"GET /health -> {status}")

    print("\nScenario verdicts (permissive / hardened):")
    last_run = None
    for sc in SCENARIOS:
        s_a, run_a = _request("POST", "/api/runs", {"scenario_id": sc, "policy_id": "baseline_permissive"})
        s_b, run_b = _request("POST", "/api/runs", {"scenario_id": sc, "policy_id": "hardened"})
        if s_a != 200 or s_b != 200:
            report.check(False, f"{sc}: run requests returned {s_a}/{s_b}")
            continue
        last_run = run_b
        va, vb = run_a["verdict"], run_b["verdict"]
        print(f"  {sc}: {va}/{run_a['score']}  |  {vb}/{run_b['score']}")
        report.check(vb != "FAIL", f"{sc}: hardened must not FAIL (got {vb})")
        if sc in EXPECT_PERMISSIVE_FAIL:
            report.check(va == "FAIL", f"{sc}: permissive should FAIL (got {va})")
        if sc == "CB-006":
            _check_approval_flow(report, run_b)

    # Report generation on the last successful run. With a Vultr key the report is written
    # by the model, so only check that Markdown came back, not the offline template's title.
    if last_run:
        s_rep, rep = _request("GET", f"/api/runs/{last_run['id']}/report")
        content = rep.get("content", "") if isinstance(rep, dict) else ""
        report.check(s_rep == 200 and content.lstrip().startswith("#"),
                     f"report: Markdown audit report generated (HTTP {s_rep})")
    else:
        report.check(False, "report: no successful run to build a report from")


def _check_approval_flow(report, run):
    """CB-006 hardened should leave a PENDING approval; approving it must then run the tool."""
    s, pend = _request("GET", "/api/approvals?status=PENDING")
    if not report.check(s == 200 and isinstance(pend, list) and pend, "CB-006: a pending approval exists"):
        return
    # Only this run's request: approving a leftover from an earlier run would prove nothing.
    approval = next((a for a in pend if a["run_id"] == run["id"]), None)
    if not report.check(approval is not None, "CB-006: the pending approval belongs to this run"):
        return
    s_ok, result = _request("POST", f"/api/approvals/{approval['id']}/approve",
                            {"operator": "smoke-test", "reason": "automated check"})
    if not report.check(s_ok == 200, f"CB-006: approve returned {s_ok}"):
        return
    events = result["run"]["timeline"]
    report.check(any(e["type"] == "tool.execution" and e["decision"] == "allow" for e in events),
                 "CB-006: approved tool executed with a signed token")
    # A second approval must be rejected (already decided)
    s_dup, _ = _request("POST", f"/api/approvals/{approval['id']}/approve",
                        {"operator": "smoke-test"})
    report.check(s_dup == 409, f"CB-006: re-approving a decided request is refused (got {s_dup})")


def main():
    print(f"ContainBench smoke test against {BASE}")
    report = Report()
    try:
        run(report)
    except (urllib.error.URLError, ConnectionError, OSError) as e:
        print(f"\nCannot reach the API: {e}. Is the backend running? (docker compose ps)")
        return 2
    print()
    if report.failures:
        print(f"{len(report.failures)} check(s) failed.")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
