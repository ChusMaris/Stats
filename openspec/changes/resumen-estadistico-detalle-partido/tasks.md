## 1. Agregación de estadísticas

- [x] 1.1 Preparar los totales de local y visitante desde las estadísticas individuales del partido, reutilizando la asignación por plantillas y su fallback actual.
- [x] 1.2 Calcular aciertos, intentos, puntos y porcentajes para T1, T2, T3, tiros de campo y total, evitando divisiones por cero y priorizando el marcador oficial disponible.

## 2. Resumen del detalle

- [x] 2.1 Sustituir los paneles de líderes, MVP y porcentajes por un resumen visual comparativo de ambos equipos inspirado en la referencia.
- [x] 2.2 Colocar el resumen inmediatamente después de «Contraer ficha» y antes del selector y la tabla de jugadores, conservando estos controles.
- [x] 2.3 Adaptar el resumen a pantallas estrechas sin desbordamiento y representar con claridad los casos sin datos individuales.

## 3. Validación

- [x] 3.1 Verificar el desglose para un partido con estadísticas de ambos equipos y que los tiros de campo excluyen los tiros libres.
- [x] 3.2 Verificar marcador oficial con desglose incompleto y tipos de tiro sin intentos.
- [x] 3.3 Confirmar visualmente la ubicación y que la tabla/selector siguen funcionando y los tres paneles anteriores ya no aparecen.
- [x] 3.4 Ejecutar la comprobación de build o pruebas disponible para el proyecto.