-- Migration: abrir RLS para ciclo de vida de competiciones (soft-delete/restore/purge)
-- Contexto: el frontend controla acceso con `brafa_admin_mode`; no hay validación de permisos en BD.
-- Esta migración permite SELECT/UPDATE/DELETE para roles anon y authenticated.

-- competiciones
ALTER TABLE IF EXISTS competiciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_competiciones_public_select ON competiciones;
DROP POLICY IF EXISTS p_competiciones_public_update ON competiciones;
DROP POLICY IF EXISTS p_competiciones_public_delete ON competiciones;
CREATE POLICY p_competiciones_public_select ON competiciones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_competiciones_public_update ON competiciones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_competiciones_public_delete ON competiciones FOR DELETE TO anon, authenticated USING (true);

-- equipos
ALTER TABLE IF EXISTS equipos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_equipos_public_select ON equipos;
DROP POLICY IF EXISTS p_equipos_public_update ON equipos;
DROP POLICY IF EXISTS p_equipos_public_delete ON equipos;
CREATE POLICY p_equipos_public_select ON equipos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_equipos_public_update ON equipos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_equipos_public_delete ON equipos FOR DELETE TO anon, authenticated USING (true);

-- partidos
ALTER TABLE IF EXISTS partidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_partidos_public_select ON partidos;
DROP POLICY IF EXISTS p_partidos_public_update ON partidos;
DROP POLICY IF EXISTS p_partidos_public_delete ON partidos;
CREATE POLICY p_partidos_public_select ON partidos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_partidos_public_update ON partidos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_partidos_public_delete ON partidos FOR DELETE TO anon, authenticated USING (true);

-- calendario
ALTER TABLE IF EXISTS calendario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_calendario_public_select ON calendario;
DROP POLICY IF EXISTS p_calendario_public_update ON calendario;
DROP POLICY IF EXISTS p_calendario_public_delete ON calendario;
CREATE POLICY p_calendario_public_select ON calendario FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_calendario_public_update ON calendario FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_calendario_public_delete ON calendario FOR DELETE TO anon, authenticated USING (true);

-- plantillas
ALTER TABLE IF EXISTS plantillas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_plantillas_public_select ON plantillas;
DROP POLICY IF EXISTS p_plantillas_public_update ON plantillas;
DROP POLICY IF EXISTS p_plantillas_public_delete ON plantillas;
CREATE POLICY p_plantillas_public_select ON plantillas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_plantillas_public_update ON plantillas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_plantillas_public_delete ON plantillas FOR DELETE TO anon, authenticated USING (true);

-- estadisticas_jugador_partido
ALTER TABLE IF EXISTS estadisticas_jugador_partido ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_estadisticas_public_select ON estadisticas_jugador_partido;
DROP POLICY IF EXISTS p_estadisticas_public_update ON estadisticas_jugador_partido;
DROP POLICY IF EXISTS p_estadisticas_public_delete ON estadisticas_jugador_partido;
CREATE POLICY p_estadisticas_public_select ON estadisticas_jugador_partido FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_estadisticas_public_update ON estadisticas_jugador_partido FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_estadisticas_public_delete ON estadisticas_jugador_partido FOR DELETE TO anon, authenticated USING (true);

-- partido_movimientos
ALTER TABLE IF EXISTS partido_movimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_movimientos_public_select ON partido_movimientos;
DROP POLICY IF EXISTS p_movimientos_public_update ON partido_movimientos;
DROP POLICY IF EXISTS p_movimientos_public_delete ON partido_movimientos;
CREATE POLICY p_movimientos_public_select ON partido_movimientos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_movimientos_public_update ON partido_movimientos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_movimientos_public_delete ON partido_movimientos FOR DELETE TO anon, authenticated USING (true);

-- jugadores
ALTER TABLE IF EXISTS jugadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_jugadores_public_select ON jugadores;
DROP POLICY IF EXISTS p_jugadores_public_update ON jugadores;
DROP POLICY IF EXISTS p_jugadores_public_delete ON jugadores;
CREATE POLICY p_jugadores_public_select ON jugadores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY p_jugadores_public_update ON jugadores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_jugadores_public_delete ON jugadores FOR DELETE TO anon, authenticated USING (true);
