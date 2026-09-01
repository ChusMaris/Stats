-- Migration: índices de rendimiento para soft-delete/restore/purge por competición
-- Objetivo: reducir tiempos de UPDATE/DELETE en tablas grandes y evitar statement timeout.

CREATE INDEX IF NOT EXISTS idx_equipos_competicion_id ON equipos (competicion_id);
CREATE INDEX IF NOT EXISTS idx_partidos_competicion_id ON partidos (competicion_id);
CREATE INDEX IF NOT EXISTS idx_calendario_competicion_id ON calendario (competicion_id);

CREATE INDEX IF NOT EXISTS idx_plantillas_equipo_id ON plantillas (equipo_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_jugador_id ON plantillas (jugador_id);

CREATE INDEX IF NOT EXISTS idx_estadisticas_partido_id ON estadisticas_jugador_partido (partido_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_partido_id ON partido_movimientos (partido_id);

-- Índices útiles para búsquedas de restauración y filtrado por estado
CREATE INDEX IF NOT EXISTS idx_equipos_competicion_deleted ON equipos (competicion_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_partidos_competicion_deleted ON partidos (competicion_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_calendario_competicion_deleted ON calendario (competicion_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_plantillas_equipo_deleted ON plantillas (equipo_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_estadisticas_partido_deleted ON estadisticas_jugador_partido (partido_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_movimientos_partido_deleted ON partido_movimientos (partido_id, deleted_at);
