# Runbook — running ContainBench on a Vultr VM

A step-by-step checklist to bring the full stack up in **docker mode** (real
ephemeral containers) and verify it before a demo. Each step says how to confirm
it worked. Run the commands on the Vultr Linux instance unless noted.

## 0. Prerequisites

- [ ] A Vultr Linux VM (Ubuntu 22.04+ recommended), SSH access, 2+ vCPU / 4+ GB RAM.
- [ ] Docker Engine + Compose v2 installed and running:
  ```bash
  docker version && docker compose version
  sudo systemctl status docker --no-pager | head -3
  ```
- [ ] Your user can run Docker (`docker ps` works without sudo, or prefix with sudo).
- [ ] Git installed, and the repo cloned:
  ```bash
  git clone <your-repo-url> containbench && cd containbench
  ```
  (No remote yet? copy the folder to the VM with `scp -r` or `rsync`.)

## 1. Configure secrets and environment

All of these are read by `docker/docker-compose.yml`. Set them in your shell
before `up`, or put them in `docker/.env`.

- [ ] Generate and export the required values:
  ```bash
  cd docker
  export VULTR_API_KEY="<your Vultr Serverless Inference key>"   # optional but enables live LLM
  export CONTAINBENCH_API_KEY="$(openssl rand -hex 24)"          # REQUIRED (API auth)
  export APPROVAL_SECRET="$(openssl rand -hex 32)"               # keeps approval tokens valid across restarts
  export BASIC_AUTH_USER="admin"
  export BASIC_AUTH_PASSWORD="<choose a strong password>"        # web UI login
  # export DEFAULT_MODEL=auto                                    # default; picks a model from Vultr's catalog
  ```
- [ ] Note the two values you'll need later:
  - `CONTAINBENCH_API_KEY` → for the smoke test and API calls.
  - `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` → to log into the dashboard.

> If `CONTAINBENCH_API_KEY` is unset, `docker compose up` fails on purpose (the
> backend must not run without an API key behind the Docker socket).

## 2. Launch the stack

- [ ] Build and start everything:
  ```bash
  docker compose up -d --build
  ```
  This builds the sandbox image (`containbench-agent-sandbox:latest`), starts the
  mock receptor, the backend (bound to `127.0.0.1:8000`) and the frontend
  (`0.0.0.0:3000`), and creates the `containbench-net` network and `containbench-data` volume.
- [ ] Confirm all services are up:
  ```bash
  docker compose ps
  ```
  Expect `mock-receptor`, `containbench-backend`, `containbench-frontend` as `running`
  (`agent-sandbox-image` exits 0 after building the image — that's correct).

## 3. Verify the services

- [ ] Backend health (from the VM; backend is VM-local only):
  ```bash
  curl -s http://localhost:8000/health
  ```
  Expect `"execution_mode":"docker"` (`"auto"` is fine too if it fell back).
- [ ] The backend sees the Docker daemon (so it will use the real runner):
  ```bash
  docker compose logs backend | grep -i "simulator\|docker" | tail -5
  ```
  You should NOT see "Falling back to the simulator". If you do, the Docker socket
  mount or permissions are wrong (see Troubleshooting).
- [ ] The sandbox image exists:
  ```bash
  docker image ls | grep containbench-agent-sandbox
  ```
- [ ] The receptor answers:
  ```bash
  docker compose exec mock-receptor python3 -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8080/health').read())"
  ```

## 4. Run the smoke test (the key validation)

- [ ] From the repo root on the VM:
  ```bash
  CONTAINBENCH_URL=http://localhost:8000 CONTAINBENCH_API_KEY="$CONTAINBENCH_API_KEY" \
    python3 scripts/smoke_test.py
  ```
- [ ] Expect `All checks passed.` and a verdict matrix where **hardened is never FAIL**.
  - In docker mode, CB-001/CB-002 may show INCONCLUSIVE if the canary/receptor
    aren't reached — that's honest, not a failure of the test.
  - CB-003/004/005/006 permissive should FAIL (attack succeeds without controls).
- [ ] This is the evidence that real containment works end to end. Capture the output
  (screenshot / copy) for the demo.

## 5. Open the dashboard

- [ ] Expose port 3000 (Vultr firewall / security group) or tunnel it:
  ```bash
  ssh -L 3000:localhost:3000 user@<vm-ip>   # from your laptop, if not exposing publicly
  ```
- [ ] Browse to `http://<vm-ip>:3000` (or `http://localhost:3000` via the tunnel),
  log in with `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`.
- [ ] Click **A/B Containment Demo** (CB-001): you should get a permissive FAIL and a
  hardened PASS side by side, with the decisive controls listed.
- [ ] Check the **Human Approvals** tab after running CB-006 hardened: a PENDING
  request appears; Approve it (enter an operator name) and the tool runs with a
  signed token.

## 6. (Optional) Plug in a real agent

- [ ] Run an agent that speaks the `/act` contract. Local, no key:
  ```bash
  # needs Ollama on the VM with a model pulled, e.g. `ollama pull qwen3:4b`
  python3 examples/agent/llm_agent.py        # http://0.0.0.0:9000/act
  ```
  Or hosted (Vultr/Groq/OpenRouter):
  ```bash
  LLM_BASE_URL=https://api.groq.com/openai/v1 LLM_MODEL=openai/gpt-oss-120b \
    LLM_API_KEY=<key> python3 examples/agent/llm_agent.py
  ```
- [ ] The `backend` service already maps `host.docker.internal` to the VM
  (`extra_hosts` in `docker-compose.yml`), so use `http://host.docker.internal:9000/act`
  as the endpoint. (Or run the agent as another compose service on `containbench-net`
  and use `http://<service>:9000/act`.)
- [ ] Shortcut without an `/act` server: use `ollama` (or `ollama://<model>`) as the
  endpoint. The backend then asks Ollama on the VM directly
  (`LLM_AGENT_BASE_URL`, default `http://host.docker.internal:11434/v1` in Compose).
  Ollama must listen on all interfaces for the container to reach it:
  `OLLAMA_HOST=0.0.0.0 ollama serve`.
- [ ] In the dashboard, open a scenario → **Test Scenario** → paste the endpoint in
  **Agent endpoint** → Run. The run's timeline shows an `agent.decision` event with
  the actions your agent chose.

## 7. Teardown

- [ ] Stop and remove (keep the data volume):
  ```bash
  docker compose down
  ```
- [ ] Full reset including stored runs/approvals:
  ```bash
  docker compose down -v
  ```

## Troubleshooting

| Symptom | Likely cause / fix |
| :--- | :--- |
| `up` fails: `CONTAINBENCH_API_KEY` not set | Export it (step 1). It is required. |
| Backend logs "Falling back to the simulator" | Docker socket not mounted or no permission. Confirm `/var/run/docker.sock` is mounted and the backend can use it. |
| Scenarios run but CB-002/CB-003 always INCONCLUSIVE | Sandboxes can't reach `mock-receptor.local`. Check the `mock-receptor` service is on both `containbench-net` and `containbench-sandbox`, and that the backend has `DOCKER_SANDBOX_NETWORK=containbench-sandbox`. |
| CB-001 always INCONCLUSIVE in docker | The decoy secret wasn't provisioned/denied as expected. Check backend logs for the container's root-stage output. |
| `/health` works but API calls 401 | Missing/incorrect `X-API-Key`. The smoke test and the frontend send it automatically; manual curls must include `-H "X-API-Key: $CONTAINBENCH_API_KEY"`. |
| Dashboard loads but shows 0 scenarios | Browser reached the frontend but the API proxy failed, or you aren't logged in. Re-check basic auth and that the backend is healthy. |
| Vultr explanation/report looks generic | No valid `VULTR_API_KEY`, so it used the deterministic fallback. Verdicts are unaffected; set a valid key for live LLM text. |
| External agent runs always fall back to reference | The backend can't reach `agent_endpoint`. Fix networking (step 6) or raise `AGENT_TIMEOUT_SECONDS` for slow local models. |

## Demo-day minimum

If you only have 5 minutes on the VM: do steps 1, 2, 3 and **4**. A green smoke
test is the single most convincing artifact — it proves real containment across
all six scenarios.
