## 1. Diagnóstico del cuello de botella

- [ ] 1.1 Confirmar que `fetchTeamStats` está realizando consultas secuenciales por partido.
- [ ] 1.2 Identificar el punto exacto de latencia en los accesos a `vw_kpi_plusminus` y `partido_movimientos`.

## 2. Optimización de la carga de detalle del equipo

- [ ] 2.1 Añadir un helper para fragmentar IDs en lotes seguros antes de usar `in(...)`.
- [ ] 2.2 Reemplazar el bucle secuencial de partidos por consultas por lotes en `fetchTeamStats`.
- [ ] 2.3 Ejecutar las consultas de vista y movimientos de cada lote en paralelo para reducir el tiempo total.
- [ ] 2.4 Verificar que la salida devuelta sigue siendo idéntica a la lógica anterior.

## 3. Cobertura de regresión

- [ ] 3.1 Añadir un test que valide la partición por lotes y el orden de los IDs.
- [ ] 3.2 Ejecutar la suite de tests para confirmar que la optimización no rompe la lógica de plus/minus.

## 4. Validación final

- [ ] 4.1 Ejecutar `npm test` para confirmar la regresión y flujo de cálculo.
- [ ] 4.2 Revisar el diff final para confirmar que la corrección queda acotada al acceso de datos y la regresión asociada.
