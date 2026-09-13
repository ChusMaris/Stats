## Why

La pantalla de estadísticas tarda mucho en cargar cuando el usuario selecciona un equipo porque la consulta del detalle del equipo hace varias rondas de acceso a Supabase y, además, consulta los movimientos de cada partido de forma individual. Con una competición grande, ese patrón de N+1 multiplica el tiempo total de respuesta y deja la UI bloqueada durante varios segundos.

## What Changes

- Reducir el número de llamadas a Supabase al obtener los movimientos y el +/- del equipo seleccionado.
- Agrupar los identificadores de partido en lotes para reutilizar consultas `in(...)` en vez de consultar un partido a la vez.
- Mantener la lógica actual de cálculo y renderizado del detalle del equipo, sin cambiar la experiencia del usuario ni la estructura de datos visible.
- Añadir una prueba de regresión para asegurar que los lotes se generan en tamaños seguros y sin alterar el orden.

## Capabilities

### New Capabilities
- `team-stats-query-optimization`: Define cómo se agrupan las consultas de partido, movimientos y +/- para que el detalle del equipo cargue de forma eficiente sin cambiar el comportamiento funcional.

### Modified Capabilities
- `<existing-name>`: <what requirement is changing>

## Impact

- `services/dataService.ts`: ajuste del flujo de carga de `fetchTeamStats` para usar consultas por lotes.
- `utils/playerPlusMinus.test.ts`: regresión para validar el particionado de IDs y proteger el rendimiento del detalle del equipo.
- Sin cambios de esquema ni dependencias externas adicionales; la corrección es interna al acceso de datos y la lógica de cálculo actual.
