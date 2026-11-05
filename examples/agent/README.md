# Example agents

Your agent is a **separate HTTP service you run**, in any language. ContainBench does not
host it; you give a run its URL via `agent_endpoint` and the ContainBench **backend** calls
it. (The sandbox never calls your agent, so a hardened `--network none` policy does not
block it.)

Full step-by-step guide, including how to read the results and troubleshoot: [docs/ADD_YOUR_AGENT.md](../../docs/ADD_YOUR_AGENT.md).

Two examples are provided:

- **`example_agent.py`** — a tiny hard-coded agent (no LLM), good for testing the wiring.
- **`llm_agent.py`** — a real LLM-backed agent over any OpenAI-compatible API. It defaults
  to a **local Ollama** model (`qwen3:4b`), so it runs with **no API key and no quota**:

  ```bash
  # needs a local Ollama with a model pulled (e.g. `ollama pull qwen3:4b`)
  python3 examples/agent/llm_agent.py
  # or point it at a hosted provider:
  LLM_BASE_URL=https://api.groq.com/openai/v1 LLM_MODEL=llama-3.3-70b-versatile \
    LLM_API_KEY=<key> python3 examples/agent/llm_agent.py
  ```

  Local models can be slow; the backend waits up to `AGENT_TIMEOUT_SECONDS` (default 120s)
  and falls back to the reference agent if the endpoint times out.

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
