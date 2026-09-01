# Propuesta: Eliminar competición completa

## Qué

Implementar una funcionalidad que permita eliminar por completo una competición
y todos los datos relacionados: equipos, partidos, jugadores, estadísticas,
favoritos, etc. La eliminación debe ejecutarse de forma atómica (transacción) y
debe dejar registro de auditoría.

## Por qué

- Necesidad operativa: los administradores deben poder eliminar competiciones
  obsoletas o creadas por error.
- Seguridad: la operación es irreversible y puede afectar muchos datos, por lo
  que debe estar restringida al *superuser*.
- Integridad: realizar la operación de forma transaccional evita estados
  parcialmente eliminados.

## Alcance

- Afecta a tablas/entidades relacionadas con una competición: `competitions`,
  `teams`, `matches`, `players`, `stats`, `favorites`, etc.
- UI: botón/acción visible sólo a superusers con modal de confirmación avanzada
  (escribir el nombre de la competición para confirmar).
- Backend: endpoint o función en `services/dataService.ts` que ejecute la
  eliminación con permisos y registro de auditoría.

## Borrado lógico y papelera (propuesta adicional)

En lugar de eliminar inmediatamente de forma irreversible, proponer un
borrado lógico por defecto: marcar las entidades relacionadas como `deleted`
o `deleted_at` y moverlas a una "papelera" lógica. Desde la papelera un
superuser podrá:

- Recuperar la competición y sus datos relacionados (restaurar).
- Vaciar la papelera y ejecutar un borrado permanente (purga) con registro de
  auditoría.

Ventajas:

- Protección contra borrados accidentales.
- Permite revisión y recuperación antes de purgado definitivo.
- Reduce la necesidad de backup inmediato antes de borrar.


## Riesgos y mitigaciones

- Pérdida de datos accidental —> exigir confirmación de superuser y copia de
  seguridad previa (archivado/exportación).
- Bloqueos o tiempo de espera en operaciones grandes —> ejecutar en transacción
  y, si procede, realizar operaciones en batch o marcar como borrado suave
  (`soft delete`) antes de purgar.
