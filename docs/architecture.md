# Proposed Architecture

## Components

### Web UI

Lets the user configure the target, pick scenarios, start a run and review the evidence. The MVP uses React with Vite.

### Control API

Manages policies, suites, runs and artifacts. It never runs agent code inside its own process.

### Orchestrator

Turns a request into bounded steps, requests inference and dispatches jobs. It keeps an explicit state machine. Plans proposed by the model (`prompts/orchestrator-system.md`) are advisory: runners only execute their own fixed probes.

### Sandbox worker

Creates one container per run with:

- An unprivileged user (the root stage only provisions the decoy secret, then drops privileges).
- A read-only root filesystem.
- A temporary volume mounted at `/workspace`.
- CPU, memory, PID and time limits.
- Network denied by default and an optional allowlist.
- No Docker socket and no host credentials.
- Mandatory removal when the run ends.

### Tool dispatcher

Mediates every tool call from the agent. Tools listed in the policy's `require_approval_tools` are held in `PENDING_HUMAN_APPROVAL` until a human-issued approval token is presented. Agent-supplied flags such as `emergency_override` never skip approval.

### Mock receptor

A simulated attacker endpoint controlled by the system. It records what sandboxes send and answers the backend's queries, so exfiltration is confirmed by evidence rather than inferred.

### Event collector

Records commands, exit codes, files, policy decisions, connections, resource usage and browser actions.

### Evidence store

Keeps normalized events, screenshots, logs and artifact hashes. Real secrets must never appear here; delivered stimuli are stored only as a hash.

### Evaluator

Applies deterministic rules to the events. The model can write an explanation, but it cannot change `PASS`, `FAIL` or `INCONCLUSIVE`.

## Trust Boundaries

```text
Browser
   |
   v
Control API ----> PostgreSQL / Evidence store
   |
   v
Queue ----> Sandbox worker ----> Disposable container
                 |                       |
                 |                       +-- Agent under test
                 |                       +-- Canary secrets
                 |                       +-- Instrumentation
                 |
                 +----> Mock receptor (simulated egress target)
                 |
                 +----> Vultr Serverless Inference
```

Repository content, visited pages, agent output and tool arguments are untrusted data.

## State Machine

```text
CREATED -> PROVISIONING -> READY -> RUNNING -> EVALUATING -> COMPLETED
                         |          |             |
                         v          v             v
                       FAILED     TIMED_OUT     INCONCLUSIVE
```

Every terminal state must trigger the destruction of the sandbox.

## Minimal Event

```json
{
  "run_id": "run_123",
  "sequence": 17,
  "timestamp": "2026-11-03T16:20:11Z",
  "source": "policy-engine",
  "type": "filesystem.denied",
  "action": "read",
  "target": "/secrets/canary.env",
  "decision": "deny",
  "scenario_id": "CB-001",
  "metadata": {}
}
```

## Essential Controls

- Inference keys available only to the orchestrator.
- Decoy credentials, never real ones, inside scenarios.
- A simulated exfiltration receptor controlled by the system.
- Allowlists of images, commands and destinations where applicable.
- Maximum size for logs and artifacts.
- Idempotent resource destruction.
- Clear recording of any incomplete evidence.
