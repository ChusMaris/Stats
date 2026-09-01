## ADDED Requirements

### Requirement: Interpretación del marcador según la categoría
El sistema SHALL interpretar el marcador de las categorías mini como reiniciado en cada periodo y el marcador de las categorías no mini como acumulado durante todo el partido.

#### Scenario: Continuidad del marcador no mini entre periodos
- **WHEN** comienza un nuevo periodo no mini con un marcador igual o superior al último marcador válido del periodo anterior
- **THEN** el sistema calcula únicamente el incremento respecto a ese último marcador válido

#### Scenario: Reinicio del marcador mini entre periodos
- **WHEN** comienza un nuevo periodo mini y se registra el primer marcador del periodo
- **THEN** el sistema calcula el incremento usando cero a cero como base del nuevo periodo

### Requirement: Validación de deltas de anotación
El sistema MUST generar eventos de anotación solamente cuando ningún componente del marcador disminuya respecto a la base aplicable y al menos uno de ellos aumente.

#### Scenario: Incremento válido del marcador
- **WHEN** un marcador incrementa los puntos de uno o ambos equipos sin reducir el marcador del otro
- **THEN** el sistema genera un delta no negativo con los puntos añadidos a cada equipo y actualiza la base válida

#### Scenario: Regresión inválida del marcador no mini
- **WHEN** un marcador no mini reduce los puntos de cualquier equipo respecto a la última base válida
- **THEN** el sistema ignora el movimiento sin generar un delta ni reemplazar la última base válida

#### Scenario: Marcador repetido
- **WHEN** un movimiento contiene el mismo marcador que la base aplicable
- **THEN** el sistema no genera ningún evento de anotación

### Requirement: Asignación del impacto a jugadores en pista
El sistema SHALL aplicar cada delta válido al +/- de los jugadores cuyos intervalos en pista incluyan la secuencia del evento, usando la perspectiva local o visitante de su equipo.

#### Scenario: Jugador en pista durante una anotación propia
- **WHEN** un delta válido a favor del equipo del jugador ocurre dentro de uno de sus intervalos en pista
- **THEN** el sistema incrementa su +/- por la diferencia neta de puntos de ese evento

#### Scenario: Jugador fuera de pista durante una anotación
- **WHEN** un delta válido ocurre fuera de todos los intervalos en pista del jugador
- **THEN** el sistema no modifica su +/- por ese evento

#### Scenario: Evento inválido dentro de un intervalo
- **WHEN** un movimiento con regresión de marcador ocurre mientras el jugador está en pista
- **THEN** el sistema no modifica su +/- por ese movimiento

### Requirement: Conservación del comportamiento mini
El sistema MUST mantener el cálculo de +/- basado en marcadores reiniciados por periodo para las categorías mini al incorporar la corrección no mini.

#### Scenario: Partido mini con varios periodos
- **WHEN** un partido mini contiene anotaciones en periodos consecutivos cuyos marcadores vuelven a comenzar desde cero
- **THEN** el sistema suma una sola vez los deltas válidos de cada periodo en el +/- de los jugadores correspondientes

### Requirement: Selección del valor final por categoría
El sistema MUST usar el +/- calculado desde movimientos como fuente preferente para categorías no mini y MUST conservar la vista de +/- como fuente preferente para categorías mini.

#### Scenario: Valor calculado disponible en categoría no mini
- **WHEN** existe un +/- calculado desde movimientos para un jugador de categoría no mini
- **THEN** el sistema muestra ese valor aunque exista un valor diferente en la vista o en la estadística persistida

#### Scenario: Categoría mini con valor de vista disponible
- **WHEN** existe un +/- de vista para un jugador de categoría mini
- **THEN** el sistema conserva el valor de la vista como estadística mostrada

#### Scenario: Fuente preferente no disponible
- **WHEN** no existe un valor en la fuente preferente de la categoría
- **THEN** el sistema usa la vista disponible o, en último término, el valor persistido