## Context

`calculatePlusMinusFromMovements` ordena los movimientos de cada partido, transforma los marcadores registrados en deltas de anotación y asigna esos deltas a los intervalos en pista de cada jugador. Actualmente, al cambiar de periodo, un descenso de la suma del marcador puede reiniciar la base incluso en categorías no mini. Esa heurística mezcla dos modelos distintos: marcador reiniciado por periodo en mini y marcador acumulado durante todo el partido en no mini.

La corrección debe permanecer dentro del procesamiento de eventos de marcador. La construcción de intervalos, la orientación local/visitante y la obtención final de estadísticas no necesitan cambiar.

## Goals / Non-Goals

**Goals:**

- Mantener una base de marcador acumulada entre periodos para categorías no mini.
- Reiniciar la base al comienzo de cada periodo únicamente para categorías mini.
- Aceptar solo deltas de anotación no negativos y evitar que una regresión del marcador contamine la base válida.
- Verificar mediante regresiones que cada delta válido se asigna solamente a los jugadores en pista.
- Aplicar el resultado corregido a la estadística final de categorías no mini.

**Non-Goals:**

- Rediseñar la detección de sustituciones o el cálculo de minutos.
- Modificar la vista `vw_kpi_plusminus` o el esquema de Supabase.
- Corregir datos históricos inválidos en la base de datos.
- Cambiar la duración de los periodos por categoría.

## Decisions

### Separar la base del marcador según el formato de competición

En categorías mini, cada primer marcador de un nuevo periodo se comparará con cero. En categorías no mini, el primer marcador del periodo se comparará con el último marcador acumulado válido del periodo anterior.

Se descarta mantener la heurística basada en la suma total porque no distingue una corrección regresiva de un reinicio legítimo y puede ocultar el descenso de uno de los dos equipos.

### Validar cada componente del delta

Un evento solo actualizará la base y generará anotación cuando `deltaL >= 0` y `deltaV >= 0`, y al menos uno sea positivo. Si cualquiera de los componentes es negativo, el evento se ignorará y se conservará la última base válida para evaluar los siguientes movimientos.

Se descarta validar únicamente `deltaL + deltaV` porque una bajada de un equipo podría quedar compensada por una subida del otro y producir un evento aparentemente válido.

### Conservar el modelo actual de intervalos

Los eventos validados seguirán usando sus secuencias ordenadas y se asignarán con los límites actuales de cada intervalo. Esto limita el cambio a la fuente del error y evita introducir variaciones en minutos o sustituciones.

### Seleccionar la fuente final según la categoría

En categorías no mini, `fetchTeamStats` usará el +/- calculado desde movimientos cuando esté disponible. En categorías mini conservará `vw_kpi_plusminus` como fuente preferente. Si la fuente preferente no contiene una clave, se mantendrá el fallback a la vista y al valor persistido para no perder estadísticas de partidos sin movimientos completos.

Se descarta seguir ignorando `playerPlusMinus` porque dejaría la corrección sin efecto en la estadística mostrada.

### Extraer una unidad comprobable y usar Vitest

La normalización de marcadores se aislará en una función pura para probar las políticas mini y no mini con secuencias pequeñas. Se añadirá Vitest como runner compatible con el proyecto Vite y un script de pruebas en `package.json`. La función será reutilizada por el servicio, pero no formará parte de su API pública de consumo.

Se descarta depender únicamente de scripts de depuración manuales porque no proporcionan aserciones repetibles ni protección frente a regresiones posteriores.

## Risks / Trade-offs

- [Datos no mini que realmente reinicien el marcador por periodo] -> Se tratarían como inválidos porque contradicen el formato esperado; los casos detectados deberán corregirse en origen o clasificarse como mini.
- [Primer movimiento disponible con marcador acumulado distinto de cero] -> Se contabilizará el salto desde cero si no existe una base previa; las pruebas deben documentar este comportamiento compatible con datos incompletos.
- [Corrección posterior que vuelve a superar la última base válida] -> El delta se calculará contra la última base aceptada, evitando tanto puntos negativos como doble conteo.
- [Nueva dependencia de desarrollo] -> Usar Vitest, alineado con Vite, y limitar la configuración al entorno Node necesario para funciones puras.

## Migration Plan

1. Incorporar la validación de deltas y ejecutar las pruebas del cálculo para ambos formatos.
2. Desplegar el cambio sin migraciones de datos ni configuración.
3. Comparar partidos representativos no mini y mini con sus secuencias de marcador conocidas.
4. Si aparece una regresión, revertir el cambio de lógica; no hay estado persistente nuevo que deshacer.

## Open Questions

- Ninguna para la implementación: el indicador `es_mini` es la fuente de verdad disponible para seleccionar la política de marcador.