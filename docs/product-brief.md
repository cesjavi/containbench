# Product brief

## Usuario objetivo

- Equipos que construyen agentes con acceso a herramientas.
- Responsables de plataforma, AppSec y DevSecOps.
- Empresas que necesitan evidencia antes de habilitar autonomía.

## Trabajo que resuelve

Antes de desplegar una versión de un agente, el equipo necesita comprobar que sus límites de filesystem, red, secretos, recursos y aprobaciones continúan funcionando.

## Propuesta de valor

ContainBench convierte controles abstractos en experimentos reproducibles. Ejecuta ataques seguros dentro de infraestructura desechable y muestra exactamente qué ocurrió.

## Alcance del MVP

### Incluido

- Aplicación web con creación y consulta de ejecuciones.
- Un agente de referencia con herramientas de shell y navegador.
- Sandboxes Docker efímeros en una VM de Vultr.
- Inferencia mediante Vultr Serverless Inference.
- Seis escenarios incorporados.
- Políticas configurables de red, archivos, recursos y aprobación.
- Eventos en tiempo real e informe final.
- Comparación entre dos ejecuciones o políticas.

### Fuera de alcance

- Certificación formal de seguridad.
- Ejecución de malware real.
- Ataques contra servicios públicos o de terceros.
- Compatibilidad universal con todos los frameworks de agentes.
- Garantía de detección de todas las vulnerabilidades.

## Historia de demostración

Se ejecuta el mismo agente con dos políticas:

1. **Baseline permisiva:** el agente lee un secreto señuelo y alcanza un receptor de red simulado.
2. **Política endurecida:** el acceso al secreto y la conexión quedan bloqueados y registrados.

La interfaz compara ambas líneas de tiempo y explica qué control redujo el radio de daño.

## Métricas

- Escenarios ejecutados de forma reproducible.
- Controles que bloquearon el comportamiento esperado.
- Intentos peligrosos observados.
- Datos señuelo expuestos o exfiltrados.
- Tiempo hasta contención.
- CPU, memoria, procesos y tráfico utilizados.
- Acciones sensibles que requirieron aprobación.

## Criterios de finalización

- Una ejecución completa se inicia desde el navegador.
- El sandbox no comparte secretos ni filesystem con el orquestador.
- Los seis escenarios producen un resultado objetivo.
- El reporte enlaza cada conclusión con eventos concretos.
- Un timeout o fallo del modelo no deja recursos activos.
- La demo funciona desde una URL pública.

