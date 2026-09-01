# Tareas de implementación

1. [x] Añadir metadata del cambio y artefactos (ya creado):
   - `openspec/changes/eliminar-competicion/.openspec.yaml`

2. [x] Backend: añadir funciones `softDeleteCompetition`, `restoreCompetition`, `hardDeleteCompetition` en `services/dataService.ts`:
   - [x] Validar que la sesión pertenece a un `superuser`.
   - [x] Implementar borrado lógico por defecto: marcar `deleted_at`.
   - [x] Añadir funciones para `soft-delete` (mover a papelera), `restore` y
       `hard-delete` (purga permanente).
   - [x] Validar que la sesión pertenece a un `superuser` para operaciones de
       `hard-delete` y `vaciar papelera`.
   - [ ] Crear backup/archivo opcional de filas afectadas antes de purga definitiva.
   - [x] Registrar en `audit_logs` (si existe tabla).
   - [x] Devolver resultado con `operation_id`.

3. API: exponer endpoint protegido `DELETE /api/competitions/:id` que invoque
   a `deleteCompetition`.

4. UI: añadir acción en la vista de competición (por ejemplo,
   `CompetitionFilters`/`CompetitionFilterForm` o la página de competición):
   - Mostrar botón solo a superuser.
    - Modal de confirmación que exige escribir el nombre de la competición.
    - Opción por defecto: "Mover a papelera". Si se elige "Borrar
       permanentemente", mostrar advertencia adicional.
    - Añadir página `Papelera` que liste competiciones y elementos borrados con
       acciones `Restaurar` y `Vaciar papelera`.

5. Tests:
   - Unit tests para el check de permisos.
   - Integration tests que creen datos relacionados y validen la limpieza.

6. Migraciones (opcional): crear tablas `*_archive` y `audit_logs` si no
   existen.

9. [x] Migraciones (requerido): añadir columnas `deleted_at TIMESTAMP NULL` a las tablas afectadas.
   - [x] Añadido `migrations/2026-08-25-add-deleted_at.sql`.
   - [ ] Actualizar queries selectivas para ignorar filas marcadas como borradas por defecto.

10. Job opcional: tarea programada para purgar entradas de la papelera con
   más de N días o para ejecutar purgas manuales iniciadas por superuser.

11. Tests adicionales:
   - Unit tests para los endpoints `soft-delete`, `restore` y `hard-delete`.
   - Integration tests para flujo de mover a papelera → restaurar → purgar.

12. Documentación: actualizar README con la nueva semántica de borrado y
   procedimientos para restauración y purga.

7. Documentación: actualizar README y añadir notas sobre el procedimiento y
   medidas de seguridad.

8. Revisiones y despliegue: code review y despliegue a staging, ejecutar pruebas
   manuales con una competición de ejemplo, luego desplegar a producción.

---

Estado: pendiente de implementación.
