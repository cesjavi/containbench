import logging
from app.config import settings
from app.runners.base import BaseRunner
from app.runners.simulator_runner import SimulatorRunner

logger = logging.getLogger("containbench.runners")

def get_runner() -> BaseRunner:
    """Retorna el runner adecuado según la configuración y disponibilidad de Docker."""
    mode = settings.EXECUTION_MODE.lower()
    
    if mode == "simulator":
        return SimulatorRunner()
        
    if mode in ["docker", "auto"]:
        try:
            import docker
            client = docker.from_env()
            client.ping()
            from app.runners.docker_runner import DockerRunner
            return DockerRunner()
        except Exception as e:
            if mode == "docker":
                logger.warning(f"Modo Docker solicitado pero el daemon no respondió ({e}). Usando simulador.")
            return SimulatorRunner()
            
    return SimulatorRunner()

__all__ = ["BaseRunner", "SimulatorRunner", "get_runner"]

