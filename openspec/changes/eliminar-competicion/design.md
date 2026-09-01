# Diseño: Cómo eliminar una competición completa

## Resumen

La eliminación se implementará en el backend como una operación transaccional
que valida que el usuario actual es `superuser`. Se añadirá una ruta API o un
método en `services/dataService.ts` que ejecute los borrados en el orden
necesario, haga backup previo y registre la operación en una tabla de auditoría.

## Autorización

- Requisito: sólo el `superuser` puede invocar la operación. La comprobación se
  realizará en backend basándose en la sesión (campo `is_superuser` o rol en la
  tabla `users`). No confiar en controles sólo en frontend.

## Flujo (alto nivel)

1. El usuario superuser solicita la eliminación desde la UI.
2. Mostrar modal de confirmación que exige escribir el nombre exacto de la
  competición y marcar una casilla de advertencia.
3. Backend recibe la petición y valida permisos.

4. Elección entre borrado lógico (por defecto) y borrado físico:

  - Borrado lógico (recomendado): marcar las filas afectadas con un
    `deleted_at` (timestamp) o `is_deleted` = true. Estas filas permanecen en
    la BD y se muestran en la "papelera". Registrar en `audit_logs`.

  - Borrado físico (purga): sólo ejecutable por superuser desde la UI de
    papelera o por job programado; elimina permanentemente las filas. Antes de
    purgar, opcionalmente exportar o mover a tablas `_archive`.

5. Si se usa borrado físico, ejecutar la eliminación en una transacción y
  registrar la operación en `audit_logs` con `user_id`, `competition_id`,
  `timestamp`, `details`.
6. Devolver resultado y un identificador de operación para auditoría.

## Manejo de DB (ejemplo con Supabase / Postgres)

Ejemplo pseudo-SQL para borrado lógico (recomendado):

```sql
BEGIN;
-- Marcar como borrado en tablas relacionadas
UPDATE competitions SET deleted_at = now() WHERE id = $1;
UPDATE teams SET deleted_at = now() WHERE competition_id = $1;
UPDATE matches SET deleted_at = now() WHERE competition_id = $1;
UPDATE players SET deleted_at = now() WHERE competition_id = $1;
UPDATE stats SET deleted_at = now() WHERE competition_id = $1;

-- Registrar auditoría
INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
VALUES ($2, 'soft_delete_competition', 'competition', $1, 'soft deleted');
COMMIT;
```

Ejemplo pseudo-SQL para purga física (vaciar papelera):

```sql
BEGIN;
-- Opcional: mover a tablas de archivo antes de borrar
INSERT INTO competitions_archive SELECT * FROM competitions WHERE deleted_at IS NOT NULL AND competition_id = $1;
-- Eliminaciones físicas
DELETE FROM stats WHERE competition_id = $1 AND deleted_at IS NOT NULL;
DELETE FROM matches WHERE competition_id = $1 AND deleted_at IS NOT NULL;
DELETE FROM players WHERE competition_id = $1 AND deleted_at IS NOT NULL;
DELETE FROM teams WHERE competition_id = $1 AND deleted_at IS NOT NULL;
DELETE FROM competitions WHERE id = $1 AND deleted_at IS NOT NULL;

INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
VALUES ($2, 'hard_delete_competition', 'competition', $1, 'permanently deleted');
COMMIT;
```
cadena de borrado, pero comprobar primero que no haya efectos secundarios.


## UI

- Botón `Eliminar competición` visible solo a superuser. Por defecto abrirá el
  modal de borrado lógico (mover a papelera).
- Modal: nombre de competición (texto a escribir) + checkbox "He leído y
  entiendo que esto es irreversible" (cuando aplique) + opciones:
  - "Mover a papelera (recomendado)"
  - "Borrar permanentemente (purga)" (marcará que la acción es irreversible)
- Página `Papelera` accesible a superusers: lista competiciones y elementos
  marcados como borrados con acciones `Restaurar` y `Vaciar papelera` (purga).
- Mostrar progreso y resultado (éxito/fallo) con link al `audit_log`.

## Telemetría y auditoría

- Guardar en `audit_logs` quién hizo la operación y cuándo.
- Enviar evento a sistema de logs/monitoring.

Adicional: incluir el campo `operation_id` y un reason/message para facilitar
revisiones posteriores.

## Pruebas

- Tests unitarios para comprobar la verificación de permisos.
- Tests de integración que crean una competición con datos relacionados y
  verifican que quedan eliminados tras la operación.
