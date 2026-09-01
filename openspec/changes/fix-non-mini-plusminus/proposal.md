## Why

El cálculo de la estadística +/- en categorías no pre-mini interpreta incorrectamente algunos cambios de periodo y variaciones del marcador, lo que asigna diferencias de puntos erróneas a los jugadores en pista. Es necesario corregirlo para que las estadísticas reflejen únicamente los puntos realmente anotados durante cada intervalo de juego sin alterar el comportamiento de las categorías mini.

## What Changes

- Diferenciar explícitamente la interpretación del marcador acumulado de competiciones no mini frente al marcador reiniciado por periodo de competiciones mini.
- Calcular los deltas de anotación no mini usando una base válida y coherente entre periodos.
- Ignorar transiciones o correcciones de marcador que producirían deltas negativos o puntos ficticios.
- Usar el +/- calculado desde movimientos como fuente preferente en categorías no mini, manteniendo la vista actual para mini.
- Añadir cobertura de regresión para cambios de periodo, marcadores acumulados y reiniciados, y asignación de +/- a los jugadores en pista.

## Capabilities

### New Capabilities
- `player-plus-minus-calculation`: Define cómo se obtienen y validan los deltas de marcador y cómo se asignan al +/- de cada jugador según sus intervalos en pista para categorías mini y no mini.

### Modified Capabilities

Ninguna.

## Impact

- Lógica de agregación de movimientos y cálculo de +/- en `services/dataService.ts`.
- Pruebas o utilidades de regresión asociadas al procesamiento de movimientos y marcadores.
- Nueva dependencia de desarrollo para ejecutar pruebas unitarias en el proyecto Vite.
- No se prevén cambios en APIs públicas, esquema de base de datos ni dependencias de producción.