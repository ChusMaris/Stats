## Why

El detalle ampliado del partido muestra actualmente tres bloques separados de estadísticas que ocupan espacio después de la tabla de jugadores y no ofrecen la comparación visual de anotación de la web de la federación. Se sustituirán por un resumen comparativo más compacto y se colocará al inicio del detalle, donde se consulta antes de revisar las estadísticas individuales.

## What Changes

- Sustituir «Líderes estadísticos», «MVP» y «Porcentajes de tiro» por un único resumen de distribución y eficiencia de anotación para ambos equipos.
- Mostrar los puntos totales de cada equipo y el desglose comparativo de tiros de 2, triples, tiros libres, tiros de campo y total, siguiendo la referencia visual adjunta.
- Colocar el resumen inmediatamente después del control «Contraer ficha» y antes de la lista de jugadores.
- Mantener la tabla y el selector de equipo para las estadísticas individuales; retirar únicamente las tres cajas actuales.

## Capabilities

### New Capabilities
- `match-scoring-summary`: Resumen visual comparativo de puntos y eficiencia de tiro de ambos equipos en el detalle ampliado de un partido.

### Modified Capabilities
- Ninguna.

## Impact

- `components/TeamStats.tsx`: cálculo y presentación del resumen del partido y reubicación respecto a la tabla de jugadores.
- No se prevén cambios en el esquema de Supabase, las API ni dependencias externas; el componente ya recibe las estadísticas individuales del partido.