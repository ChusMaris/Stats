## Why

La cuadrícula de partidos del equipo necesita poder enlazar cada partido con su vídeo oficial de YouTube, pero hoy no existe ningún campo ni renderizado que permita guardar ni mostrar ese recurso. El dato se debe conservar junto al partido, y el botón solo debe aparecer cuando hay enlace disponible; si el campo está vacío, la fila debe seguir viéndose limpia y sin icono.

## What Changes

- Añadir un campo opcional `youtube_link` al registro de cada partido para guardar la URL del video en la tabla de partidos de Supabase.
- Incluir ese campo en el modelo de datos del partido para que el flujo de carga del calendario y los partidos reales lo transporte fielmente al cliente.
- Mostrar un botón con el logo de YouTube dentro de la tarjeta o fila del partido cuando el campo tiene valor y ocultarlo cuando está vacío.
- Abrir el video en una nueva pestaña y mantener el comportamiento visual sin romper el layout existente del grid.
- Usar un icono visual de YouTube para distinguir claramente la acción de reproducción del resto de controles del partido.

## Capabilities

### New Capabilities
- `match-video-link`: Define cómo se guarda, valida y presenta un enlace de YouTube asociado a un partido para su visualización en la cuadrícula de partidos del equipo.

### Modified Capabilities
- Ninguna.

## Impact

- Modelos de datos en `types.ts` y consultas de `services/dataService.ts` para incluir el campo `youtube_link` en los partidos cargados.
- Componentes del grid de partidos que renderizan la tarjeta/fila del partido, especialmente la vista del equipo o calendario donde se muestran los partidos.
- Base de datos de Supabase: se añadirá un campo opcional en la tabla `partidos` y se validará que el enlace solo se muestre cuando realmente exista.
- Dependencias de UI: se añadirá la imagen del logo de YouTube como recurso visual del botón; no se requieren librerías nuevas ni cambios grandes en la arquitectura existente.
