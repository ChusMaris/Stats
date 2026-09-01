-- Migration: Añadir columna deleted_at para borrado lógico (soft delete)
-- Ejecutar en la BD (psql / supabase sql)

BEGIN;

ALTER TABLE IF EXISTS competiciones ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE IF EXISTS equipos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE IF EXISTS partidos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE IF EXISTS calendario ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE IF EXISTS plantillas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE IF EXISTS estadisticas_jugador_partido ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE IF EXISTS partido_movimientos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE IF EXISTS jugadores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- Indexes to speed up papelera queries
CREATE INDEX IF NOT EXISTS idx_competiciones_deleted_at ON competiciones (deleted_at);
CREATE INDEX IF NOT EXISTS idx_equipos_deleted_at ON equipos (deleted_at);
CREATE INDEX IF NOT EXISTS idx_partidos_deleted_at ON partidos (deleted_at);

COMMIT;

-- Nota: después de ejecutar la migración, actualizar las consultas del
-- frontend/backend para ignorar filas con deleted_at IS NOT NULL por defecto.
