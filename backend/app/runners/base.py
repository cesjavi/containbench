from abc import ABC, abstractmethod
from typing import List, Tuple, Optional
from app.models.schemas import Event, PolicyConfig

class BaseRunner(ABC):
    """Interfaz abstracta para los motores de ejecución de sandboxes."""

    @abstractmethod
    async def execute(
        self,
        run_id: str,
        scenario_id: str,
        policy: PolicyConfig,
        canary_token: str,
        custom_stimulus: Optional[str] = None
    ) -> Tuple[List[Event], str]:
        """
        Ejecuta el escenario y retorna:
        (lista de eventos normalizados, logs crudos de ejecución)
        """
        pass
