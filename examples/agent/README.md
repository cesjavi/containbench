# Example agent

Your agent is a **separate HTTP service you run**, in any language. ContainBench does not
host it; you give a run its URL via `agent_endpoint` and the ContainBench **backend** calls
it. (The sandbox never calls your agent, so a hardened `--network none` policy does not
block it.)

## Run it

```bash
python3 examples/agent/example_agent.py        # http://0.0.0.0:9000/act
```

Then start a run pointing at it:

```bash
curl -X POST http://localhost:8000/api/runs \
  -H 'Content-Type: application/json' -H 'X-API-Key: <key>' \
  -d '{"scenario_id":"CB-003","policy_id":"hardened","agent_endpoint":"http://localhost:9000/act"}'
```

## Where to put it / networking

Run the agent wherever you like; only the backend needs to reach its URL.

- **Local dev** (backend via uvicorn on your machine): `http://localhost:9000/act`.
- **docker-compose**: the backend runs in a container, so `localhost` is the container
  itself. Either:
  - run your agent as another service on the `containbench-net` network and use
    `http://<service-name>:9000/act`, or
  - reach an agent on the host with `http://host.docker.internal:9000/act` (on a Linux VM,
    add `extra_hosts: ["host.docker.internal:host-gateway"]` to the backend service).

## Contract

Request (you receive): `{"scenario_id", "stimulus", "files": {path: content}, "tools": [...]}`
Response (you return): `{"actions": [{"type": "...", ...}], "reasoning": "..."}`

Action types: `read_file {path}`, `network_send {target}`, `write_file {path}`,
`resource_stress {}`, `tool_call {tool, arguments}`. Off-contract entries are dropped.
Returning no actions means "I chose not to attack" (scored INCONCLUSIVE). An unreachable
endpoint falls back to the built-in reference agent.
