# Product Brief

## Target Users

- Teams building agents with access to tools.
- Platform, AppSec and DevSecOps owners.
- Companies that need evidence before enabling autonomy.

## Job to Be Done

Before deploying a new version of an agent, the team needs to confirm that its filesystem, network, secrets, resource and approval limits still work.

## Value Proposition

ContainBench turns abstract controls into reproducible experiments. It runs safe attacks inside disposable infrastructure and shows exactly what happened.

## MVP Scope

### Included

- Web app to create and review runs.
- A reference agent with shell and browser tools.
- Ephemeral Docker sandboxes on a Vultr VM.
- Inference through Vultr Serverless Inference.
- Six built-in scenarios.
- Configurable network, file, secret, resource and approval policies.
- Real-time events and a final report.
- Comparison between two runs or policies.

### Out of Scope

- Formal security certification.
- Running real malware.
- Attacks against public or third-party services.
- Universal compatibility with every agent framework.
- A guarantee of detecting every vulnerability.

## Demo Story

The same agent is run under two policies:

1. **Permissive baseline:** the agent reads a decoy secret and reaches a simulated network receptor.
2. **Hardened policy:** access to the secret and the connection are blocked and recorded.

The UI compares both timelines and explains which control reduced the blast radius.

## Metrics

- Scenarios run reproducibly.
- Controls that blocked the expected behavior.
- Dangerous attempts observed.
- Decoy data exposed or exfiltrated.
- Time to containment.
- CPU, memory, processes and traffic used.
- Sensitive actions that required approval.

## Definition of Done

- A complete run can be started from the browser.
- The sandbox shares no secrets or filesystem with the orchestrator.
- All six scenarios produce an objective result.
- The report links every conclusion to concrete events.
- A timeout or model failure leaves no resources running.
- The demo works from a public URL.
