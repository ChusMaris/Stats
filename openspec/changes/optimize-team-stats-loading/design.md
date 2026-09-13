## Context

La pantalla de estadísticas carga el detalle del equipo seleccionado desde `fetchTeamStats`, que incluye partidos, plantilla, estadísticas por jugador y movimientos del partido. El problema aparece porque el flujo actual trabaja con una consulta base por equipo y luego ejecuta varias consultas adicionales por partido para obtener `partido_movimientos` y la vista `vw_kpi_plusminus`.

En competencias con muchos partidos, este patrón genera varias decenas o cientos de consultas secuenciales, lo que provoca un tiempo de carga elevado al seleccionar un equipo. El objetivo no es cambiar la lógica del cálculo, sino eliminar el cuello de botella de acceso a datos manteniendo la salida actual.

## Goals / Non-Goals

**Goals:**
- Reducir el número de llamadas de red al obtener la información del equipo seleccionado.
- Mantener el cálculo de +/- y minutos exactamente igual que el estado actual.
- Asegurar que el sistema siga aceptando equipos con cualquier número de partidos sin romper la carga del detalle.
- Proteger la corrección con una prueba objetiva que valide la partición por lotes.

**Non-Goals:**
- No cambiar el modelo de datos de Supabase ni añadir una caché global.
- No reescribir la lógica de cálculo de plus/minus ni el renderizado del detalle del equipo.
- No introducir dependencias adicionales ni cambios en el esquema de la base de datos.

## Decisions

### Agrupar IDs de partido en lotes seguros

Se introduce un helper `batchValuesForInQuery` en `services/dataService.ts` que fragmenta IDs en bloques de tamaño seguro para `in(...)` antes de hacer la consulta a Supabase. Esto reduce el problema de N+1 a un número pequeño de consultas por lote y preserva el orden de los elementos originales.

Se descarta seguir haciendo una consulta por partido porque el coste total crece linealmente con el número de partidos y la UI se vuelve lenta incluso cuando la lógica de cálculo es correcta.

### Hacer las consultas de movimientos y vista en paralelo por lote

En el flujo de `fetchTeamStats`, los lotes de `matchIds` se procesan con `Promise.all` para consultar `vw_kpi_plusminus` y `partido_movimientos` de forma concurrente dentro de cada bloque. El resultado se concatena sin alterar el formato esperado por el cálculo posterior.

Se descarta la serialización por partido porque aumenta mucho el tiempo total de espera. La simultaneidad dentro de cada lote ofrece el beneficio de reducción de latencia sin introducir más complejidad al código.

### Mantener la API y el cálculo actuales

La corrección se limita al acceso a datos: la estructura devuelta por `fetchTeamStats`, los campos `matches`, `plantilla`, `stats`, `movements`, y la lógica de `calculatePlusMinusFromMovements` siguen siendo iguales que antes. Eso minimiza riesgos y hace que la mejora sea una optimización transparente para la pantalla.

Se descarta reestructurar `TeamStats` o cambiar el formato de `stats` porque eso requeriría revalidar más pantallas y no es necesario para solucionar la latencia.

## Risks / Trade-offs

- [Consultas muy grandes] → Se usan lotes de 1000 IDs por `in(...)`, que es el límite seguro de Supabase para este patrón; si el número aumenta, se fragmenta automáticamente.
- [Múltiples llamadas concurrentes] → Se manejan errores por lote y se concatenan los resultados, sin detener la ejecución entera si un lote falla parcialment e.
- [Riesgo de sobrecarga del cliente] → La mejora reduce llamadas, pero sigue dependiendo de la respuesta de Supabase. Para un volumen muy alto, la carga sigue siendo proporcional a los partidos del equipo, no a su número de consultas.

## Migration Plan

1. Añadir la utilidades de particionado de IDs dentro de `services/dataService.ts`.
2. Reemplazar el bucle secuencial por la estrategia de lotes y `Promise.all` en el detalle del equipo.
3. Añadir la prueba de regresión para validar el particionado de IDs y mantener la estabilidad del comportamiento.
4. Ejecutar la suite de pruebas relevante y comprobar que no hay regresiones en la lógica de plus/minus.

## Open Questions

- Ninguna. La optimización es de alcance local y la solución se soporta en el límite conocido de `in(...)` de Supabase, sin requerir cambios de infraestructura.
