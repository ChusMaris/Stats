## 1. Infraestructura de pruebas

- [x] 1.1 Añadir Vitest como dependencia de desarrollo y un script `test` no interactivo en `package.json`.
- [x] 1.2 Extraer la normalización de movimientos de marcador a una función pura reutilizable por `calculatePlusMinusFromMovements`, conservando los tipos y el orden de secuencia actuales.

## 2. Corrección del cálculo

- [x] 2.1 Implementar la continuidad de la base acumulada entre periodos para categorías no mini.
- [x] 2.2 Mantener el reinicio de la base a cero al cambiar de periodo en categorías mini.
- [x] 2.3 Rechazar deltas con cualquier componente negativo y conservar la última base válida después de un movimiento inválido.
- [x] 2.4 Integrar los eventos normalizados con la asignación existente por intervalos y perspectiva local o visitante sin modificar el cálculo de minutos.
- [x] 2.5 Usar el +/- calculado como fuente preferente para categorías no mini y conservar la vista para categorías mini, con fallbacks cuando falten datos.

## 3. Cobertura de regresión

- [x] 3.1 Añadir pruebas para continuidad no mini entre periodos, marcador repetido y regresiones de uno o ambos equipos.
- [x] 3.2 Añadir pruebas para reinicios de marcador mini en periodos consecutivos y verificar que no se duplican puntos.
- [x] 3.3 Añadir una regresión de integración que compruebe que solo los jugadores en pista reciben el impacto de eventos válidos, tanto como locales como visitantes.

## 4. Validación

- [x] 4.1 Ejecutar la suite de pruebas y confirmar que todos los escenarios de `player-plus-minus-calculation` pasan.
- [x] 4.2 Ejecutar `npm run lint` y `npm run build` para validar tipos e integración de producción.
	- `npm run build` finaliza correctamente. `npm run lint` conserva cuatro errores preexistentes fuera del alcance en `LandingPage.tsx` y otras secciones de `dataService.ts`; los archivos y líneas modificados no presentan diagnósticos.
- [x] 4.3 Comparar el +/- resultante de un partido no mini afectado y un partido mini representativo con sus secuencias de marcador esperadas.