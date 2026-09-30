## Context

El detalle ampliado de cada partido se renderiza en `components/TeamStats.tsx`. Actualmente calcula estadísticas para el equipo seleccionado y una comparación parcial de ambos equipos, presenta la tabla individual primero y deja debajo tres paneles de líderes, MVP y porcentajes.

El resumen de referencia muestra la anotación de ambos equipos a la vez. Los registros de estadísticas ya incluyen puntos, aciertos e intentos de tiros libres, de dos y de tres; las plantillas permiten agruparlos por equipo y el marcador del partido proporciona los puntos oficiales.

## Goals / Non-Goals

**Goals:**
- Sustituir los tres paneles actuales por un resumen comparativo inspirado en la sección verde de la imagen.
- Mostrar para local y visitante los puntos totales, la distribución de anotación y la eficiencia por tipo de tiro.
- Situar el resumen dentro del detalle expandido, inmediatamente tras el control «Contraer ficha» y antes de la tabla de jugadores.
- Mantener el selector de equipo y la tabla individual existentes.

**Non-Goals:**
- Cambiar el esquema de Supabase, las consultas o los tipos compartidos.
- Modificar la tabla de estadísticas individuales, el marcador principal o el cálculo del MVP fuera de este bloque.
- Añadir una dependencia de gráficos.

## Decisions

### Agregar los datos por equipo dentro del partido

Reutilizar las estadísticas individuales filtradas por partido y agruparlas usando `allPlantillas` para determinar el equipo de cada jugador, manteniendo el fallback existente basado en `teamPlayerIds` cuando no haya una plantilla disponible. Sumar aciertos e intentos de T1, T2 y T3 por separado para cada equipo.

Para los puntos mostrados, priorizar el marcador oficial cuando esté disponible y usar la suma de puntos individuales solo cuando falte. Esta distinción evita sustituir un resultado oficial válido por datos individuales parciales. Los puntos derivados de tiros se calculan como `2 × T2 anotados`, `3 × T3 anotados` y `T1 anotados`; los tiros de campo combinan T2 y T3, excluyendo tiros libres.

Se descarta usar únicamente `activeTeamStats`: depende del selector de equipo y no permite mostrar ambos equipos simultáneamente.

### Presentar un resumen comparativo para local y visitante

Renderizar un bloque de distribución y eficiencia con ambos equipos visibles a la vez, con sus puntos y desglose de tiros de dos, triples, tiros libres, tiros de campo y total. Incluir aciertos/intentos y porcentajes donde proceda, y representar visualmente la contribución al total del partido siguiendo la jerarquía de la referencia.

Se descarta reutilizar sin cambios la caja «Líderes estadísticos» porque compara conteos generales, no la distribución de puntos ni la eficiencia de tiro requeridas.

### Colocar el resumen antes de las estadísticas individuales

Insertar el resumen dentro del contenido expandido, justo después del control «Contraer ficha» y antes del selector de equipo y de la tabla. Eliminar los paneles de líderes, MVP y porcentajes que hoy se muestran después de la tabla; conservar esta última y su selector.

### Manejar datos ausentes sin porcentajes inválidos

Cuando no haya intentos para un tipo de tiro, mostrar cero intentos y un porcentaje neutro/indicado como no disponible, sin división por cero. Si no hay estadísticas individuales para un equipo, conservar sus puntos oficiales si existen y mostrar el desglose como vacío o cero sin inventar aciertos.

## Risks / Trade-offs

- [Las estadísticas individuales pueden estar incompletas respecto al marcador] → Usar el resultado oficial para los puntos totales y presentar los porcentajes según los intentos realmente registrados.
- [Plantillas incompletas pueden dificultar asignar jugadores al equipo] → Reutilizar el fallback existente y verificar casos con ambos equipos.
- [El resumen puede ocupar demasiado espacio en móvil] → Mantener el contenido en dos columnas cuando haya ancho suficiente y apilar o adaptar las tablas en pantallas estrechas, sin desbordamiento horizontal de la tarjeta.

## Migration Plan

No hay migración de datos ni despliegue de esquema. El cambio se limita al renderizado y a los agregados locales del detalle del partido; para revertirlo, se restaura el bloque actual de paneles.

## Open Questions

Ninguna. La referencia visual y la ubicación solicitada fijan el comportamiento esperado.