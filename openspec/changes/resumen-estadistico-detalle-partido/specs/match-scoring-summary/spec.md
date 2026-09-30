## ADDED Requirements

### Requirement: Comparación de distribución y eficiencia de anotación
El detalle ampliado de un partido MUST mostrar un resumen comparativo de los equipos local y visitante, con los puntos totales de cada uno y el desglose de tiros de dos, triples, tiros libres, tiros de campo y total. Para cada tipo de tiro con intentos registrados, el resumen MUST mostrar aciertos, intentos y porcentaje de acierto; la contribución de puntos por tipo MUST derivarse de los tiros anotados.

#### Scenario: Partido con estadísticas de ambos equipos
- **WHEN** se expande un partido con estadísticas individuales registradas para ambos equipos
- **THEN** el resumen muestra simultáneamente los puntos y el desglose comparativo de ambos equipos
- **AND** calcula tiros de campo combinando tiros de dos y triples, sin incluir tiros libres

#### Scenario: Tipo de tiro sin intentos registrados
- **WHEN** el resumen procesa un tipo de tiro cuyo número de intentos es cero
- **THEN** muestra cero intentos sin calcular una división por cero ni presentar un porcentaje inválido

#### Scenario: Estadísticas individuales incompletas
- **WHEN** falta el desglose individual de uno de los equipos y el marcador oficial del partido está disponible
- **THEN** el resumen conserva los puntos oficiales de ambos equipos
- **AND** no inventa aciertos ni intentos para el equipo sin desglose

### Requirement: Ubicación y sustitución de los paneles estadísticos
En el detalle expandido, el resumen MUST aparecer inmediatamente después del control «Contraer ficha» y antes del selector y la tabla de estadísticas de jugadores. El resumen MUST sustituir los paneles «Líderes estadísticos», «MVP» y «Porcentajes de tiro»; la tabla individual y su selector MUST seguir disponibles.

#### Scenario: Consulta del detalle expandido
- **WHEN** una persona expande la ficha de un partido
- **THEN** ve el resumen comparativo debajo del control «Contraer ficha» y antes de las estadísticas individuales
- **AND** no ve los paneles anteriores de líderes, MVP y porcentajes de tiro
- **AND** puede seguir seleccionando el equipo para consultar su tabla de jugadores