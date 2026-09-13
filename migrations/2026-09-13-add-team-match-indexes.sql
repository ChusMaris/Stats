-- Índices específicos para el acceso más costoso del detalle de equipo
-- Query típica: competicion_id = ? AND (equipo_local_id = ? OR equipo_visitante_id = ?)
-- También cubre el orden de movimientos por partido/periodo/minuto/segundo.

CREATE INDEX IF NOT EXISTS idx_partidos_competicion_local_id
    ON partidos (competicion_id, equipo_local_id);

CREATE INDEX IF NOT EXISTS idx_partidos_competicion_visitante_id
    ON partidos (competicion_id, equipo_visitante_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_partido_periodo_minuto_segundo
    ON partido_movimientos (partido_id, deleted_at, periodo, minuto, segundo);

CREATE INDEX IF NOT EXISTS idx_estadisticas_partido_jugador
    ON estadisticas_jugador_partido (partido_id, jugador_id, deleted_at);
