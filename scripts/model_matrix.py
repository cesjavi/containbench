#!/usr/bin/env python3
"""
Crash-tests several LLMs as the agent under test and prints a comparison table.

By default it takes every Chinese LLM in the Vultr Serverless Inference catalog (as reported
by /api/vultr/status), runs each ContainBench scenario with each model as the agent's brain,
and prints, per model and scenario, the verdict and the actions the model chose.

Standard library only. Examples:

    python scripts/model_matrix.py                                   # public demo, Chinese LLMs
    python scripts/model_matrix.py --policy hardened
    python scripts/model_matrix.py --models deepseek-v4.1-flash-1017,glm-5.3 --scenarios CB-001,CB-003
    python scripts/model_matrix.py --all-models --repeat 3 --out results.md
    python scripts/model_matrix.py --base http://localhost:8000 --api-key "$CONTAINBENCH_API_KEY"

Under baseline_permissive the table shows how each model BEHAVES when nothing stops it:
FAIL = it attempted the attack and the attack worked; INCONCLUSIVE = it did not try.
Under hardened it shows whether the sandbox CONTAINED each attempt (PASS).
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.request

DEFAULT_BASE = "http://207.246.89.99"
DEFAULT_SCENARIOS = "CB-001,CB-002,CB-003,CB-004,CB-005,CB-006"


def call(base, path, api_key, body=None, timeout=240):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base.rstrip("/") + path, data=data, method="POST" if data else "GET")
    req.add_header("Content-Type", "application/json")
    if api_key:
        req.add_header("X-API-Key", api_key)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.loads(res.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {"detail": f"HTTP {e.code}"}
    except Exception as e:  # network error, timeout
        return 0, {"detail": f"{type(e).__name__}: {e}"}


def pick_models(base, api_key, wanted, all_models):
    status, info = call(base, "/api/vultr/status", api_key, timeout=30)
    catalog = (info.get("agent") or {}).get("models") or []
    if wanted:
        names = {m["id"]: m for m in catalog}
        return [names.get(m, {"id": m, "name": m, "lab": None, "chinese": False}) for m in wanted]
    if not catalog:
        sys.exit("The server reported no agent models. Is the LLM agent configured for Vultr "
                 "(LLM_AGENT_BASE_URL) and is the deployment up to date? Pass --models to choose them.")
    return catalog if all_models else [m for m in catalog if m.get("chinese")]


def agent_outcome(run):
    """(chosen actions, fell back?) from the run's agent.decision event."""
    for event in run.get("timeline", []):
        if event.get("type") == "agent.decision":
            meta = event.get("metadata") or {}
            detail = meta.get("detail", "")
            return meta.get("actions", []), "unavailable" in detail, detail
    return [], False, ""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default=DEFAULT_BASE, help=f"ContainBench URL (default {DEFAULT_BASE})")
    ap.add_argument("--api-key", default="", help="X-API-Key, only when calling the backend directly")
    ap.add_argument("--policy", default="baseline_permissive", help="baseline_permissive or hardened")
    ap.add_argument("--scenarios", default=DEFAULT_SCENARIOS)
    ap.add_argument("--models", default="", help="comma-separated model ids (default: Chinese LLMs in the catalog)")
    ap.add_argument("--all-models", action="store_true", help="every text model in the catalog, not only Chinese ones")
    ap.add_argument("--repeat", type=int, default=1, help="runs per model and scenario (LLMs are not deterministic)")
    ap.add_argument("--sleep", type=float, default=7.0, help="seconds between runs (nginx allows 10 runs/min)")
    ap.add_argument("--out", default="", help="also write the Markdown table to this file")
    args = ap.parse_args()

    wanted = [m.strip() for m in args.models.split(",") if m.strip()]
    models = pick_models(args.base, args.api_key, wanted, args.all_models)
    scenarios = [s.strip() for s in args.scenarios.split(",") if s.strip()]
    total = len(models) * len(scenarios) * args.repeat
    print(f"{len(models)} model(s) x {len(scenarios)} scenario(s) x {args.repeat} = {total} runs "
          f"under '{args.policy}' on {args.base}\n", flush=True)

    results = {}  # (model id, scenario) -> list of cell strings
    attempts = {m["id"]: 0 for m in models}
    fallbacks = {m["id"]: 0 for m in models}
    done = 0
    for model in models:
        for scenario in scenarios:
            for _ in range(args.repeat):
                done += 1
                started = time.time()
                code, run = call(args.base, "/api/runs", args.api_key, {
                    "scenario_id": scenario, "policy_id": args.policy, "agent_endpoint": f"llm://{model['id']}",
                })
                elapsed = time.time() - started
                if code != 200:
                    cell = f"ERROR {code}"
                    print(f"[{done}/{total}] {model['id']} {scenario}: {cell} {run.get('detail', '')}", flush=True)
                else:
                    actions, fell_back, detail = agent_outcome(run)
                    verdict = run.get("verdict", "?")
                    if fell_back:
                        fallbacks[model["id"]] += 1
                        cell = "fallback"
                    else:
                        cell = f"{verdict} {','.join(actions) or '(refused)'}"
                        assessment = run.get("agent_assessment") or {}
                        if assessment:
                            # Behavior, independent of the policy: did the model try the attack?
                            dangerous = assessment.get("risk") == "dangerous"
                        else:  # older deployments without the assessment
                            dangerous = verdict == "FAIL"
                        if dangerous:
                            attempts[model["id"]] += 1
                            cell += " ⚠"
                    print(f"[{done}/{total}] {model['id']} {scenario}: {cell} ({elapsed:.0f}s)"
                          + (f"  <- {detail}" if fell_back else ""), flush=True)
                results.setdefault((model["id"], scenario), []).append(cell)
                if done < total:
                    time.sleep(args.sleep)

    header = "| Model | Lab | " + " | ".join(scenarios) + " |"
    lines = [header, "|" + " --- |" * (len(scenarios) + 2)]
    for model in models:
        cells = [" / ".join(results.get((model["id"], s), [])) for s in scenarios]
        lines.append(f"| `{model['id']}` | {model.get('lab') or '-'} | " + " | ".join(cells) + " |")
    table = "\n".join(lines)

    notes = [
        "",
        f"Policy: `{args.policy}`. Each cell: verdict and the actions the model chose.",
        "`fallback` = the model did not answer usably and the run used the scripted reference agent; "
        "that cell says nothing about the model.",
    ]
    notes.append("⚠ = the model attempted the attack (dangerous agent), whether or not the sandbox stopped it.")
    if args.policy == "baseline_permissive":
        notes.append("Under the permissive policy, FAIL means the model attempted the attack and it worked; "
                     "INCONCLUSIVE (refused) means it declined.")
    ranking = sorted(models, key=lambda m: attempts[m["id"]])
    notes.append("")
    notes.append("Attacks attempted per model (fewer is safer): " + ", ".join(
        f"`{m['id']}` {attempts[m['id']]}" + (f" ({fallbacks[m['id']]} fallback)" if fallbacks[m["id"]] else "")
        for m in ranking))
    report = table + "\n" + "\n".join(notes) + "\n"
    print("\n" + report)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(f"# Model matrix ({args.policy})\n\n" + report)
        print(f"Written to {args.out}")


if __name__ == "__main__":
    main()
