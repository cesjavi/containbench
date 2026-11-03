# ContainBench

**Crash-test your AI agent before production.**

ContainBench ejecuta agentes dentro de sandboxes desechables, los somete a escenarios adversariales y genera evidencia verificable sobre lo que intentaron hacer, qué controles funcionaron y cuál fue el radio de daño.

## Problema

Los equipos están conectando agentes a repositorios, navegadores, shells, APIs y datos internos. Las evaluaciones tradicionales miden si el agente completa una tarea, pero no qué ocurre cuando encuentra instrucciones hostiles, intenta acceder a secretos o consume recursos sin límite.

ContainBench responde una pregunta concreta:

> Cuando el agente se comporta mal, ¿la infraestructura limita realmente el daño?

## MVP

El MVP prueba un agente configurable contra seis escenarios:

1. Lectura de un secreto señuelo.
2. Intento de exfiltración por red.
3. Prompt injection desde un README o una página web.
4. Escritura fuera del workspace permitido.
5. Agotamiento de CPU, memoria o tiempo.
6. Acción sensible sin aprobación humana.

Cada ejecución devuelve:

- Línea de tiempo de llamadas y decisiones.
- Logs de procesos y red.
- Archivos creados o modificados.
- Capturas cuando interviene un navegador.
- Resultado objetivo por escenario.
- Puntaje de contención y recomendaciones.

## Flujo principal

1. El usuario registra un agente o endpoint.
2. Selecciona una política y una suite de ataques.
3. El orquestador crea un sandbox efímero.
4. Un planificador prepara la prueba.
5. El agente ejecuta la tarea bajo observación.
6. Un evaluador determinista analiza los eventos.
7. Un modelo explica los resultados sin alterar el veredicto.
8. El entorno se destruye y se conserva la evidencia permitida.

## Estructura del Proyecto

- `backend/`: API FastAPI con el orquestador de sandboxes, cliente Vultr Serverless Inference y evaluador determinista.
- `frontend/`: Aplicación web React (Vite + TypeScript + Tailwind CSS) con dashboard interactivo y comparador A/B.
- `docker/`: Definición del sandbox de contenedor efímero (`Dockerfile.agent-sandbox`) y stack de despliegue (`docker-compose.yml`).
- `docs/`: Product brief, arquitectura y especificación formal de escenarios.
- `prompts/`: Prompts de sistema para generador adversarial, evaluador y generador de reportes.

## Ejecución Rápida (Local)

### 1. Con el script automático (Windows)
Doble clic o ejecutar en terminal:
```bash
run-local.bat
```

### 2. Manualmente

**Backend (Python 3.11+):**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend (Node.js 20+):**
```bash
cd frontend
npm install
npm run dev
```

Abre en tu navegador:
- Web Dashboard: <http://localhost:3000>
- API Docs: <http://localhost:8000/docs>

## Despliegue en VM de Vultr (Producción)

En la instancia Linux de Vultr:
```bash
cd docker
VULTR_API_KEY="tu_clave_vultr" docker compose up -d --build
```

## Principio de seguridad

El modelo nunca decide por sí solo si una prueba pasó. Los eventos observables y las reglas deterministas producen el veredicto; el modelo únicamente planifica dentro de capacidades limitadas y explica la evidencia.

