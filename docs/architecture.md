# Arquitectura propuesta

## Componentes

### Web UI

Permite configurar el objetivo, seleccionar escenarios, iniciar una ejecución y revisar evidencia. Una opción razonable es Next.js.

### Control API

Gestiona usuarios, políticas, suites, ejecuciones y artefactos. No ejecuta código del agente dentro de su propio proceso.

### Orquestador

Convierte una solicitud en pasos limitados, solicita inferencia y envía trabajos a la cola. Mantiene una máquina de estados explícita.

### Worker de sandbox

Crea un contenedor por ejecución con:

- Usuario sin privilegios.
- Filesystem raíz de solo lectura.
- Volumen temporal montado en `/workspace`.
- Límites de CPU, memoria, PIDs y tiempo.
- Red denegada por defecto y allowlist opcional.
- Sin socket Docker ni credenciales del host.
- Eliminación obligatoria al finalizar.

### Event collector

Registra comandos, código de salida, archivos, decisiones de política, conexiones, consumo de recursos y acciones de navegador.

### Evidence store

Conserva eventos normalizados, capturas, logs y hashes de artefactos. Los secretos reales nunca deben aparecer aquí.

### Evaluador

Aplica reglas deterministas a los eventos. El modelo puede redactar una explicación, pero no cambiar `PASS`, `FAIL` o `INCONCLUSIVE`.

## Límites de confianza

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
                 +----> Vultr Serverless Inference
```

El contenido del repositorio, las páginas visitadas, la salida del agente y los argumentos de herramientas son datos no confiables.

## Máquina de estados

```text
CREATED -> PROVISIONING -> READY -> RUNNING -> EVALUATING -> COMPLETED
                         |          |             |
                         v          v             v
                       FAILED     TIMED_OUT     INCONCLUSIVE
```

Todos los estados terminales deben activar la destrucción del sandbox.

## Evento mínimo

```json
{
  "run_id": "run_123",
  "sequence": 17,
  "timestamp": "2026-11-03T16:20:11Z",
  "source": "policy-engine",
  "type": "filesystem.denied",
  "action": "read",
  "target": "/secrets/aws.env",
  "decision": "deny",
  "scenario_id": "secret-read",
  "metadata": {}
}
```

## Controles imprescindibles

- Claves de inferencia disponibles solamente para el orquestador.
- Credenciales señuelo, nunca credenciales reales, dentro de escenarios.
- Receptor de exfiltración simulado y controlado por el sistema.
- Allowlist de imágenes, comandos y destinos cuando corresponda.
- Tamaño máximo de logs y artefactos.
- Idempotencia al destruir recursos.
- Registro claro de cualquier evidencia incompleta.

