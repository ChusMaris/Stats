
import { supabase } from '../supabaseClient';
import { 
  Temporada, Categoria, Competicion, Partido, Equipo, EstadisticaJugadorPartido, PartidoMovimiento, PlayerAggregatedStats, ScoutingReport, CalendarioItem, CareerStats, ParallelStats 
} from '../types';

export const fetchTemporadas = async (): Promise<Temporada[]> => {
  const { data, error } = await supabase.from('temporadas').select('*').order('nombre', { ascending: false });
  if (error) throw error;
  return data as Temporada[];
};

export const fetchCategorias = async (): Promise<Categoria[]> => {
  const { data, error } = await supabase.from('categorias').select('*').order('nombre');
  if (error) throw error;
  return data as Categoria[];
};

export const fetchCompeticiones = async (temporadaId: number | string, categoriaId: number | string): Promise<Competicion[]> => {
  const { data, error } = await supabase
    .from('competiciones')
    .select('*')
    .eq('temporada_id', temporadaId)
    .eq('categoria_id', categoriaId)
    .order('nombre');
    
  if (error) throw error;
  return data as Competicion[];
};

// NEW: Función ligera para obtener resumen de la portada (Nº Equipos y Jornada Actual)
export const fetchCompetitionSummary = async (competicionId: number | string) => {
    try {
        // 1. Obtener número de equipos (Count exacto)
        const { count, error: countError } = await supabase
            .from('equipos')
            .select('*', { count: 'exact', head: true })
            .eq('competicion_id', competicionId);
        
        if (countError) throw countError;

        // 2. Obtener Jornada Actual (Basado en Tabla Calendario)
        // Usamos el inicio del día de hoy (00:00:00) para incluir partidos jugados hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        
        let currentJornada = 0;
        
        // DEBUG: Uncomment to trace query
        // console.log(`Fetching summary for ${competicionId} from date: ${todayISO}`);

        // A. Buscar el PRÓXIMO partido programado en el CALENDARIO (>= hoy 00:00)
        const { data: nextCal, error: queryError } = await supabase
            .from('calendario')
            .select('jornada, fecha_hora')
            .eq('competicion_id', competicionId)
            .gte('fecha_hora', todayISO)
            .order('fecha_hora', { ascending: true })
            .limit(1);

        if (queryError) {
             console.error("Error query calendario:", queryError);
        }

        if (nextCal && nextCal.length > 0) {
            // Encontramos un partido futuro (o de hoy), esa es la jornada que toca
            currentJornada = nextCal[0].jornada;
            // console.log("Found next match:", nextCal[0]);
        } else {
            // B. Si NO hay partidos futuros, cogemos la última jornada del calendario
            const { data: lastCal } = await supabase
                .from('calendario')
                .select('jornada')
                .eq('competicion_id', competicionId)
                .order('fecha_hora', { ascending: false }) // El último por fecha
                .limit(1);
            
            if (lastCal && lastCal.length > 0) {
                currentJornada = lastCal[0].jornada;
            } else {
                // C. Fallback defensivo: Si calendario está vacío, miramos partidos jugados
                const { data: lastMatch } = await supabase
                    .from('partidos')
                    .select('jornada')
                    .eq('competicion_id', competicionId)
                    .order('fecha_hora', { ascending: false })
                    .limit(1);
                
                if (lastMatch && lastMatch.length > 0) {
                    currentJornada = lastMatch[0].jornada || 0;
                }
            }
        }

        return {
            teamCount: count || 0,
            currentJornada: currentJornada || 1 // Defecto 1 si no hay datos
        };

    } catch (error) {
        console.error("Error fetching summary for comp " + competicionId, error);
        return { teamCount: 0, currentJornada: 0 };
    }
};

export const fetchCompeticionDetails = async (competicionId: number | string) => {
  // 0. Fetch Competition Metadata (Nombre, etc) - CRITICAL for direct links/history
  const compResponse = await supabase
    .from('competiciones')
    .select('*')
    .eq('id', competicionId)
    .single();

  if (compResponse.error) throw compResponse.error;
  const competicionData = compResponse.data as Competicion;

  // 1. Fetch Real Stats Matches (Resultados y Estadísticas)
  const matchesResponse = await supabase
    .from('partidos')
    .select(`
      *,
      equipo_local:equipos!equipo_local_id(id, nombre_especifico, clubs:clubs!equipos_club_id_fkey(id, nombre, logo_url, nombre_corto)),
      equipo_visitante:equipos!equipo_visitante_id(id, nombre_especifico, clubs:clubs!equipos_club_id_fkey(id, nombre, logo_url, nombre_corto))
    `)
    .eq('competicion_id', competicionId)
    .order('jornada', { ascending: true })
    .order('fecha_hora', { ascending: true });

  if (matchesResponse.error) throw matchesResponse.error;
  const realMatches = matchesResponse.data as Partido[];

  // 2. Fetch Schedule (Calendario Planificado)
  const calendarResponse = await supabase
    .from('calendario')
    .select(`
      *,
      equipo_local:equipos!equipo_local_id(id, nombre_especifico, clubs:clubs!equipos_club_id_fkey(id, nombre, logo_url, nombre_corto)),
      equipo_visitante:equipos!equipo_visitante_id(id, nombre_especifico, clubs:clubs!equipos_club_id_fkey(id, nombre, logo_url, nombre_corto))
    `)
    .eq('competicion_id', competicionId)
    .order('jornada', { ascending: true })
    .order('fecha_hora', { ascending: true });
    
  // If table doesn't exist yet or error, we just ignore calendar
  const calendarMatches = (calendarResponse.data || []) as unknown as CalendarioItem[];

  // 3. Merge Logic
  const mergedMatches: Partido[] = [];
  // Copia mutable para ir tachando los que encontramos en el calendario
  let availableRealMatches = [...realMatches];

  calendarMatches.forEach(cal => {
    // Buscamos si este partido del calendario ya existe en la tabla de partidos (se ha jugado o tiene acta)
    // Criterio: Mismos equipos (Local vs Visitante)
    const realMatchIndex = availableRealMatches.findIndex(rm => 
      String(rm.equipo_local_id) === String(cal.equipo_local_id) && 
      String(rm.equipo_visitante_id) === String(cal.equipo_visitante_id)
    );

    if (realMatchIndex !== -1) {
      // SI EXISTE en partidos -> Se considera JUGADO (o con datos oficiales)
      const realMatch = availableRealMatches[realMatchIndex];
      mergedMatches.push({
        ...realMatch, // Usamos ID real, Puntos reales, Stats links
        jornada: cal.jornada, // Mantenemos la jornada del calendario por consistencia visual
        es_calendario: true // Marcamos que viene de la estructura de calendario
      });
      // Lo quitamos de disponibles para no duplicarlo al final
      availableRealMatches.splice(realMatchIndex, 1);
    } else {
      // NO EXISTE en partidos -> Es un partido PENDIENTE
      mergedMatches.push({
        id: `cal_${cal.id}`, // ID temporal
        competicion_id: cal.competicion_id,
        jornada: cal.jornada,
        equipo_local_id: cal.equipo_local_id,
        equipo_visitante_id: cal.equipo_visitante_id,
        fecha_hora: cal.fecha_hora,
        equipo_local: cal.equipo_local,
        equipo_visitante: cal.equipo_visitante,
        puntos_local: undefined, // Sin resultado
        puntos_visitante: undefined, // Sin resultado
        es_calendario: true
      });
    }
  });

  // Añadimos los partidos reales que NO estaban en el calendario (ej: datos históricos o errores de calendario)
  availableRealMatches.forEach(rm => {
    mergedMatches.push({ ...rm, es_calendario: false });
  });

  // Ordenar: Primero por Jornada, luego por Fecha
  const combinedMatches = mergedMatches.sort((a, b) => {
    if ((a.jornada || 0) !== (b.jornada || 0)) return (a.jornada || 0) - (b.jornada || 0);
    return new Date(a.fecha_hora || 0).getTime() - new Date(b.fecha_hora || 0).getTime();
  });

  const teamsResponse = await supabase
    .from('equipos')
    .select(`
        *,
        clubs:clubs!equipos_club_id_fkey (*)
    `)
    .eq('competicion_id', competicionId);

  if (teamsResponse.error) throw teamsResponse.error;

  return {
    partidos: combinedMatches, // Lista fusionada para la Vista Calendario
    realMatches: realMatches, // Solo partidos reales para la Clasificación
    equipos: teamsResponse.data,
    competicion: competicionData // Return metadata
  };
};

export const createCalendarioEntry = async (entry: {
    competicion_id: number | string;
    jornada: number;
    equipo_local_id: number | string;
    equipo_visitante_id: number | string;
    fecha_hora: string;
}) => {
    const { data, error } = await supabase
        .from('calendario')
        .insert([entry])
        .select();
    
    if (error) throw error;
    return data;
};

// Update an existing calendar entry
export const updateCalendarioEntry = async (id: number | string, entry: {
    jornada: number;
    equipo_local_id: number | string;
    equipo_visitante_id: number | string;
    fecha_hora: string;
}) => {
    const { data, error } = await supabase
        .from('calendario')
        .update(entry)
        .eq('id', id)
        .select();
    
    if (error) throw error;
    return data;
};

// Update an existing match date (in partidos table)
export const updatePartidoEntry = async (id: number | string, entry: {
    jornada: number;
    equipo_local_id: number | string;
    equipo_visitante_id: number | string;
    fecha_hora: string;
}) => {
    const { data, error } = await supabase
        .from('partidos')
        .update(entry)
        .eq('id', id)
        .select();
    
    if (error) throw error;
    return data;
};

export const deleteMatch = async (id: number | string) => {
    const strId = String(id);
    // Identify if it's a calendar entry (prefixed with cal_) or a real match
    if (strId.startsWith('cal_')) {
        const realId = strId.replace('cal_', '');
        const { error } = await supabase
            .from('calendario')
            .delete()
            .eq('id', realId);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('partidos')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

/**
 * Calculates +/- (Plus Minus) for players based on play-by-play movements
 */
/**
 * Calculates +/- (Plus Minus) and Minutes Played for players based on play-by-play movements
 */
const calculatePlusMinusFromMovements = (
    movements: PartidoMovimiento[], 
    myTeamPlayerIds: Set<string>,
    esMini: boolean,
    minsPerPeriod: number,
    matchIsLocal: Record<string, boolean>
) => {
    const playerPlusMinus: Record<string, number> = {};
    const playerSeconds: Record<string, number> = {};
    
    const movementsByMatch: Record<string, PartidoMovimiento[]> = {};
    movements.forEach(m => {
        const mid = String(m.partido_id);
        if (!movementsByMatch[mid]) movementsByMatch[mid] = [];
        movementsByMatch[mid].push(m);
    });

    Object.keys(movementsByMatch).forEach(matchId => {
        const isLocal = matchIsLocal[matchId];
        const matchMovs = movementsByMatch[matchId].sort((a, b) => {
            const pA = Number(a.periodo || 0);
            const pB = Number(b.periodo || 0);
            if (pA !== pB) return pA - pB;
            const mA = typeof a.minuto === 'number' ? a.minuto : parseInt(String(a.minuto).split(':')[0] || '0', 10);
            const mB = typeof b.minuto === 'number' ? b.minuto : parseInt(String(b.minuto).split(':')[0] || '0', 10);
            if (mA !== mB) return mB - mA;
            const sA = Number(a.segundo || 0);
            const sB = Number(b.segundo || 0);
            if (sA !== sB) return sB - sA;
            return Number(a.id) - Number(b.id);
        });

        // 1. Quarter Deltas
        const quarterScores: Record<number, {l: number, v: number}> = {};
        matchMovs.filter(m => String(m.tipo_movimiento) === '116').forEach(m => {
            const parts = (m.marcador || '0-0').split('-');
            quarterScores[Number(m.periodo)] = {
                l: parseInt(parts[0] || '0'),
                v: parseInt(parts[1] || '0')
            };
        });

        const quarterDeltas: Record<number, number> = {};
        const periods = Object.keys(quarterScores).map(Number).sort((a,b) => a-b);
        
        periods.forEach((p, index) => {
            const curr = quarterScores[p];
            let l_points = curr.l;
            let v_points = curr.v;

            if (!esMini) {
                const prev = index > 0 ? quarterScores[periods[index-1]] : { l: 0, v: 0 };
                l_points -= prev.l;
                v_points -= prev.v;
            }

            if (isLocal) {
                quarterDeltas[p] = l_points - v_points;
            } else {
                quarterDeltas[p] = v_points - l_points;
            }
        });

        // 2. Player Minutes
        const playerQuarterMinutes: Record<string, Record<number, number>> = {};
        const addSeconds = (pid: string, p: number, secs: number) => {
            if (!playerQuarterMinutes[pid]) playerQuarterMinutes[pid] = {};
            playerQuarterMinutes[pid][p] = (playerQuarterMinutes[pid][p] || 0) + secs;
        };

        const onCourt = new Set<string>();
        const entryTime: Record<string, { p: number, m: number, s: number }> = {};
        const playerEventsInQuarter: Record<string, Set<number>> = {};

        matchMovs.forEach(mov => {
            const pid = String(mov.jugador_id);
            const p = Number(mov.periodo || 0);
            if (!playerEventsInQuarter[pid]) playerEventsInQuarter[pid] = new Set();
            playerEventsInQuarter[pid].add(p);

            const tipo = String(mov.tipo_movimiento || '');
            const m = typeof mov.minuto === 'number' ? mov.minuto : parseInt(String(mov.minuto).split(':')[0] || '0', 10);
            const s = Number(mov.segundo || 0);

            if (tipo === '112') { // Entra
                onCourt.add(pid);
                entryTime[pid] = { p, m, s };
            } else if (tipo === '115') { // Sale
                if (onCourt.has(pid)) {
                    const entry = entryTime[pid];
                    if (entry.p === p) {
                         addSeconds(pid, p, (entry.m * 60 + entry.s) - (m * 60 + s));
                    } else {
                        addSeconds(pid, entry.p, (entry.m * 60 + entry.s));
                        for (let i = entry.p + 1; i < p; i++) addSeconds(pid, i, minsPerPeriod * 60);
                        addSeconds(pid, p, (minsPerPeriod * 60) - (m * 60 + s));
                    }
                    onCourt.delete(pid);
                } else {
                    addSeconds(pid, p, (minsPerPeriod * 60) - (m * 60 + s));
                }
            }
        });

        Object.keys(playerEventsInQuarter).forEach(pid => {
            playerEventsInQuarter[pid].forEach(p => {
                const recordedSecs = playerQuarterMinutes[pid]?.[p] || 0;
                const hasEntry = matchMovs.some(mov => String(mov.jugador_id) === pid && Number(mov.periodo) === p && String(mov.tipo_movimiento) === '112');
                const hasExit = matchMovs.some(mov => String(mov.jugador_id) === pid && Number(mov.periodo) === p && String(mov.tipo_movimiento) === '115');

                if (!hasEntry && !hasExit && recordedSecs === 0) {
                    addSeconds(pid, p, minsPerPeriod * 60);
                }
            });
        });

        // 3. Aggregate
        Object.keys(playerQuarterMinutes).forEach(pid => {
            if (!myTeamPlayerIds.has(pid)) return;
            const key = `${matchId}_${pid}`;
            let totalPlusMinus = 0;
            let totalSeconds = 0;

            Object.keys(playerQuarterMinutes[pid]).forEach(qStr => {
                const q = Number(qStr);
                const secs = playerQuarterMinutes[pid][q];
                if (secs > 0) {
                    totalSeconds += secs;
                    totalPlusMinus += (quarterDeltas[q] || 0);
                }
            });

            playerSeconds[key] = totalSeconds;
            playerPlusMinus[key] = totalPlusMinus;
        });
    });

    return { playerPlusMinus, playerSeconds };
};

export const fetchTeamStats = async (competicionId: number | string, equipoId: number | string) => {
    const compInfo = await supabase
        .from('competiciones')
        .select('*, categorias(es_mini)')
        .eq('id', competicionId)
        .single();
    const esMini = compInfo.data?.categorias?.es_mini || false;
    const minsPerPeriod = esMini ? 6 : 10;

    const matchesResponse = await supabase
        .from('partidos')
        .select(`
            *,
            equipo_local:equipos!equipo_local_id(id, nombre_especifico, clubs:clubs!equipos_club_id_fkey(logo_url)),
            equipo_visitante:equipos!equipo_visitante_id(id, nombre_especifico, clubs:clubs!equipos_club_id_fkey(logo_url))
        `)
        .eq('competicion_id', competicionId)
        .or(`equipo_local_id.eq.${equipoId},equipo_visitante_id.eq.${equipoId}`)
        .order('fecha_hora', { ascending: false });
    
    if (matchesResponse.error) throw matchesResponse.error;

    // --- PATCH: Fix Jornada from Calendar table ---
    // Fetch calendar entries to map correct jornada numbers
    const calendarResponse = await supabase
        .from('calendario')
        .select('jornada, equipo_local_id, equipo_visitante_id')
        .eq('competicion_id', competicionId);
        
    const calendarEntries = calendarResponse.data || [];

    const matches = (matchesResponse.data || []).map((m: any) => {
         // Find corresponding calendar entry by teams
         const found = calendarEntries.find((c: any) => 
            String(c.equipo_local_id) === String(m.equipo_local_id) && 
            String(c.equipo_visitante_id) === String(m.equipo_visitante_id)
         );
         
         if (found) {
             return { ...m, jornada: found.jornada };
         }
         return m;
    });

    const matchIds = matches.map((m: any) => m.id);

    const plantillaResponse = await supabase
        .from('plantillas')
        .select(`
            dorsal,
            jugador_id,
            equipo_id,
            jugadores (*)
        `)
        .eq('equipo_id', equipoId);
    
    if (plantillaResponse.error) throw plantillaResponse.error;

    let statsData: EstadisticaJugadorPartido[] = [];
    if (matchIds.length > 0) {
        // Fetch stats for BOTH teams in these matches to handle logic correctly
        const statsResponse = await supabase
            .from('estadisticas_jugador_partido')
            .select('*')
            .in('partido_id', matchIds);
            
        if (statsResponse.error) throw statsResponse.error;
        statsData = statsResponse.data || [];
    }

    let movementsData: PartidoMovimiento[] = [];
    if (matchIds.length > 0) {
        const movsResponse = await supabase
            .from('partido_movimientos')
            .select('*')
            .in('partido_id', matchIds)
            .order('id', { ascending: true });
        
        if (!movsResponse.error) {
            movementsData = movsResponse.data || [];
        }
    }

    // --- CALCULATE PLUS MINUS & MINUTES ---
    const myTeamPlayerIds = new Set<string>(plantillaResponse.data?.map((p: any) => String(p.jugador_id)) || []);
    
    const matchIsLocal: Record<string, boolean> = {};
    matches.forEach((m: any) => {
        matchIsLocal[String(m.id)] = String(m.equipo_local_id) === String(equipoId);
    });

    const { playerPlusMinus, playerSeconds } = calculatePlusMinusFromMovements(movementsData, myTeamPlayerIds, esMini, minsPerPeriod, matchIsLocal);

    // Final Injection
    // IMPORTANT: If pmMap is undefined, default to 0 to avoid UI dashes unless strictly necessary
    const finalStats = statsData.map((s: EstadisticaJugadorPartido) => {
        const key = `${s.partido_id}_${s.jugador_id}`;
        const seconds = playerSeconds[key] || 0;
        
        // Format seconds to MM:SS
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

        return {
            ...s,
            mas_menos: playerPlusMinus[key] ?? (s.mas_menos || 0),
            tiempo_jugado: seconds > 0 ? timeStr : s.tiempo_jugado
        };
    });

    return {
        matches: matches, // Use patched matches
        plantilla: plantillaResponse.data,
        stats: finalStats,
        movements: movementsData
    };
};

// --- SCOUTING FUNCTIONS ---

// Helper to parse 'tiempo_jugado' from database (e.g. "23:54" or number)
const parseTiempoJugado = (tiempo: string | number | undefined): number => {
    if (!tiempo) return 0;
    if (typeof tiempo === 'number') return tiempo;
    if (typeof tiempo === 'string') {
        const parts = tiempo.split(':');
        if (parts.length === 2) {
            const min = parseInt(parts[0], 10) || 0;
            const sec = parseInt(parts[1], 10) || 0;
            return min + (sec / 60);
        } else if (parts.length === 1) {
            return parseFloat(parts[0]) || 0;
        }
    }
    return 0;
};

// Helper to fetch global historical stats for a list of player IDs
const fetchHistoricalPlayerStats = async (playerIds: (string | number)[]): Promise<Record<string, CareerStats>> => {
    if (!playerIds || playerIds.length === 0) return {};

    // Fetch ALL stats for these players, ignoring competition_id
    // This allows us to see stats from previous seasons or other leagues
    // Added 'tiempo_jugado' to the selection
    const { data: allStats, error } = await supabase
        .from('estadisticas_jugador_partido')
        .select('jugador_id, puntos, t3_anotados, t3_intentados, t1_anotados, t1_intentados, tiempo_jugado')
        .in('jugador_id', playerIds);

    if (error) {
        console.error("Error fetching historical stats", error);
        return {};
    }

    const history: Record<string, CareerStats> = {};

    (allStats || []).forEach((stat: any) => {
        const pid = String(stat.jugador_id);
        if (!history[pid]) {
            history[pid] = {
                gamesPlayed: 0,
                totalPoints: 0,
                ppg: 0,
                avgT3Made: 0,
                t1Pct: 0,
                bestScoringGame: 0,
                totalMinutes: 0, // NEW
                mpg: 0, // NEW
                // internal accumulators
                _t3Made: 0,
                _t3Att: 0,
                _t1Made: 0,
                _t1Att: 0
            } as any;
        }

        const h = history[pid] as any;
        h.gamesPlayed++;
        h.totalPoints += (stat.puntos || 0);
        
        // Accumulate minutes
        h.totalMinutes += parseTiempoJugado(stat.tiempo_jugado);

        h._t3Made += (stat.t3_anotados || 0);
        h._t3Att += (stat.t3_intentados || 0);
        h._t1Made += (stat.t1_anotados || 0);
        h._t1Att += (stat.t1_intentados || 0);
        
        if ((stat.puntos || 0) > h.bestScoringGame) {
            h.bestScoringGame = stat.puntos || 0;
        }
    });

    // Final calculations
    Object.keys(history).forEach(pid => {
        const h = history[pid] as any;
        h.ppg = h.gamesPlayed > 0 ? h.totalPoints / h.gamesPlayed : 0;
        h.mpg = h.gamesPlayed > 0 ? h.totalMinutes / h.gamesPlayed : 0; // Calc historical MPG
        h.avgT3Made = h.gamesPlayed > 0 ? h._t3Made / h.gamesPlayed : 0; 
        h.t1Pct = h._t1Att > 0 ? (h._t1Made / h._t1Att) * 100 : 0;
        delete h._t3Made; delete h._t3Att; delete h._t1Made; delete h._t1Att;
    });

    return history;
};

// NEW: Helper to fetch "Parallel" stats (Same season, DIFFERENT competition)
const fetchParallelPlayerStats = async (seasonId: number | string, currentCompId: number | string, playerIds: (string | number)[]): Promise<Record<string, ParallelStats>> => {
    if (!playerIds || playerIds.length === 0 || !seasonId) return {};

    // We need to fetch matches from THIS season but OTHER competitions
    // This requires a join: estadisticas -> partidos -> (filter season, exclude current comp)
    // Fix: partidos table does not have temporada_id, we must join competiciones to filter by temporada_id
    
    const { data: parallelData, error } = await supabase
        .from('estadisticas_jugador_partido')
        .select(`
            jugador_id,
            puntos,
            partido:partidos!inner (
                id,
                competicion_id,
                competiciones!inner (
                    id,
                    nombre,
                    temporada_id
                )
            )
        `)
        .in('jugador_id', playerIds)
        // Fix: partidos table does not have temporada_id, we must filter via the joined competiciones table
        .eq('partido.competiciones.temporada_id', seasonId)
        .neq('partido.competicion_id', currentCompId);

    if (error) {
        console.error("Error fetching parallel stats", error);
        return {};
    }

    const parallel: Record<string, ParallelStats> = {};
    
    (parallelData || []).forEach((item: any) => {
        const pid = String(item.jugador_id);
        const p = item.partido;
        const comp = p.competiciones;

        // Skip if somehow the filter didn't work (paranoid check)
        if (String(p.competicion_id) === String(currentCompId)) return;
        // Check season via competition relation
        if (String(comp.temporada_id) !== String(seasonId)) return;

        if (!parallel[pid]) {
            parallel[pid] = {
                gamesPlayed: 0,
                ppg: 0,
                competitionNames: [],
                isPrimaryContext: false, // Calculated later
                // internal
                _totalPoints: 0
            } as any;
        }
        
        const rec = parallel[pid] as any;
        rec.gamesPlayed++;
        rec._totalPoints += (item.puntos || 0);
        
        const compName = comp.nombre;
        if (compName && !rec.competitionNames.includes(compName)) {
            rec.competitionNames.push(compName);
        }
    });

    // Finalize
    Object.keys(parallel).forEach(pid => {
        const rec = parallel[pid] as any;
        rec.ppg = rec.gamesPlayed > 0 ? rec._totalPoints / rec.gamesPlayed : 0;
        delete rec._totalPoints;
    });

    return parallel;
};


const SHOOTING_FOUL_IDS = ['160', '161', '162', '165', '166', '537', '540', '544', '549'];

const calculateTeamAggregates = (matches: Partido[], stats: EstadisticaJugadorPartido[], plantilla: any[], equipoId: number | string) => {
    const playedMatches = matches.filter(m => m.puntos_local !== null && m.puntos_local !== undefined);
    const totalMatches = playedMatches.length;

    if (totalMatches === 0) return null;

    let totalPoints = 0;
    let totalPointsAgainst = 0;
    let totalT3Made = 0;
    let totalT1Made = 0;
    let totalT1Att = 0;

    playedMatches.forEach((m: any) => {
        const isLocal = String(m.equipo_local_id) === String(equipoId);
        const myPts = isLocal ? (m.puntos_local || 0) : (m.puntos_visitante || 0);
        const oppPts = isLocal ? (m.puntos_visitante || 0) : (m.puntos_local || 0);
        
        totalPoints += myPts;
        totalPointsAgainst += oppPts;
    });

    stats.forEach((s: any) => {
        if(String(s.id).includes('ignore')) return; 
        totalT3Made += (s.t3_anotados || 0);
        totalT1Made += (s.t1_anotados || 0);
        totalT1Att += (s.t1_intentados || 0);
    });

    // Sort by Date Descending
    const sortedMatches = playedMatches.sort((a, b) => new Date(b.fecha_hora || 0).getTime() - new Date(a.fecha_hora || 0).getTime());

    const form = sortedMatches
        .slice(0, 5) 
        .map((m: any) => {
            const isLocal = String(m.equipo_local_id) === String(equipoId);
            const myPts = isLocal ? (m.puntos_local || 0) : (m.puntos_visitante || 0);
            const oppPts = isLocal ? (m.puntos_visitante || 0) : (m.puntos_local || 0);
            return myPts > oppPts ? 'W' : (myPts < oppPts ? 'L' : 'D');
        });

    const ppg = totalPoints / totalMatches;
    const papg = totalPointsAgainst / totalMatches;
    const ftPct = totalT1Att > 0 ? (totalT1Made / totalT1Att) * 100 : 0;
    const t3PerGame = totalT3Made / totalMatches;

    return {
        ppg,
        papg,
        ftPct,
        t3PerGame,
        form,
        totalMatches,
        totalPoints,
        sortedMatchesIds: sortedMatches.map((m: any) => m.id)
    };
};

/**
 * GENERADOR DE INFORME DE SCOUTING (IA SIMULADA)
 * ----------------------------------------------
 * Esta función es el cerebro del análisis. Toma datos crudos y los convierte en "Insights" de texto.
 * 
 * ESTRATEGIA DE ANÁLISIS:
 * 1. Métricas: Basadas en VOLUMEN (anotados) porque no tenemos intentados de T2 y T3.
 * 2. Histórico (Career Stats): Un jugador puede tener una mala temporada, pero ser una estrella (Gigante Dormido).
 * 3. Amenazas Reales: Filtramos "ruido" estadístico. Solo nos importan jugadores que cambian partidos.
 * 4. Comparativa (Head-to-Head): Cruzamos datos del equipo A vs equipo B para predecir el ritmo.
 */
export const getTeamScoutingReport = async (competicionId: number | string, equipoId: number | string, rivalId?: number | string): Promise<ScoutingReport> => {
    // 1. Fetch data for the CURRENT competition (Standard process)
    const { matches, plantilla, stats, movements } = await fetchTeamStats(competicionId, equipoId);
    
    // 1b. Need Season ID to check for "playing up" (parallel stats)
    // We can fetch it from the single competition info
    const compInfo = await supabase.from('competiciones').select('temporada_id').eq('id', competicionId).single();
    const seasonId = compInfo.data?.temporada_id;

    // 2. Fetch HISTORICAL data (Contexto de carrera para detectar anomalías en el rendimiento actual)
    const playerIds = plantilla.map((p: any) => p.jugador_id).filter(Boolean);
    const historicalStats = await fetchHistoricalPlayerStats(playerIds);
    
    // 3. Fetch PARALLEL data (Same season, different category)
    const parallelStats = seasonId ? await fetchParallelPlayerStats(seasonId, competicionId, playerIds) : {};

    // Calculate Main Team Aggregates
    const teamAgg = calculateTeamAggregates(matches, stats, plantilla, equipoId);
    
    if (!teamAgg) {
        return {
            teamStats: { ppg: 0, papg: 0, t3PerGame: 0, ftPct: 0, last5Form: [] },
            keyPlayers: { topScorer: null, topShooter: null, topRebounder: null, foulMagnet: null, badFreeThrowShooter: null },
            rosterStats: [],
            insights: ["Datos insuficientes para generar informe."]
        };
    }

    // --- CÁLCULO DE MÉTRICAS POR JUGADOR ---
    const playerStats: PlayerAggregatedStats[] = plantilla.map((p: any) => {
        if (!p) return null;
        const pStats = stats.filter((s: EstadisticaJugadorPartido) => s && String(s.jugador_id) === String(p.jugador_id));
        const pMovements = movements.filter((m: PartidoMovimiento) => m && String(m.jugador_id) === String(p.jugador_id));
        
        const gp = pStats.length;
        
        // Stats acumuladas (Temporada Actual)
        const totalPts = pStats.reduce((sum, s) => sum + (s.puntos || 0), 0);
        const totalMins = pStats.reduce((sum, s) => sum + parseTiempoJugado(s.tiempo_jugado), 0); // Calculate current season minutes
        
        const t1A = pStats.reduce((sum, s) => sum + (s.t1_anotados || 0), 0);
        const t1I = pStats.reduce((sum, s) => sum + (s.t1_intentados || 0), 0);
        // T2 y T3 solo tenemos Anotados (Intentados no fiable/no disponible)
        const t2A = pStats.reduce((sum, s) => sum + (s.t2_anotados || 0), 0);
        const t2I = pStats.reduce((sum, s) => sum + (s.t2_intentados || 0), 0);
        const t3A = pStats.reduce((sum, s) => sum + (s.t3_anotados || 0), 0);
        const t3I = pStats.reduce((sum, s) => sum + (s.t3_intentados || 0), 0);
        const faltasTiro = pMovements.filter(m => SHOOTING_FOUL_IDS.includes(String(m.tipo_movimiento))).length;
        
        // NEW: Plus-Minus Accumulation (Already injected by fetchTeamStats)
        const totalMasMenos = pStats.reduce((sum, s) => sum + (s.mas_menos || 0), 0);

        // NEW: Calculate Total Fouls for FPG logic
        const totalFouls = pStats.reduce((sum, s) => sum + (s.faltas_cometidas || 0) + (s.tecnicas || 0) + (s.antideportivas || 0), 0);

        // Recent Form (Últimos N partidos JUGADOS POR EL JUGADOR):
        // 1. Sort player's stats by Match Date (using teamAgg.sortedMatchesIds order which is date desc)
    const pStatsSorted = [...pStats].sort((a: EstadisticaJugadorPartido, b: EstadisticaJugadorPartido) => {
            const idxA = teamAgg.sortedMatchesIds.indexOf(a.partido_id);
            const idxB = teamAgg.sortedMatchesIds.indexOf(b.partido_id);
            // lower index = more recent
            return idxA - idxB; 
        });

        // 2. Take top 3 actual participations
        const lastGames = pStatsSorted.slice(0, 3);
        const lastGamesCount = lastGames.length;
        
        const lastGamesPts = lastGames.reduce((sum, s) => sum + (s.puntos || 0), 0);
        const last3PPG = lastGamesCount > 0 ? lastGamesPts / lastGamesCount : 0;

        // Points Share (Heliocentrismo):
        const pointsShare = teamAgg.totalPoints > 0 ? (totalPts / teamAgg.totalPoints) * 100 : 0;

        // Retrieve Historical Data
        const career = historicalStats[String(p.jugador_id)];
        
        // Retrieve Parallel Data
        const parallel = parallelStats[String(p.jugador_id)];
        if (parallel) {
            // Determine if playing elsewhere is their "primary" context
            // Heuristic: If they played more games elsewhere than here
            parallel.isPrimaryContext = parallel.gamesPlayed > gp;
        }

        // Handle potential array response for jugadores
        const jugadorData = Array.isArray(p.jugadores) ? (p.jugadores as any)[0] : p.jugadores;

        return {
            jugadorId: p.jugador_id,
            nombre: jugadorData?.nombre_completo,
            dorsal: p.dorsal,
            fotoUrl: jugadorData?.foto_url,
            partidosJugados: gp,
            totalPuntos: totalPts,
            totalMinutos: totalMins, // Store accumulated minutes
            totalFaltas: totalFouls, // FIXED: Now calculated
            totalFaltasTiro: faltasTiro,
            totalTiros3Anotados: t3A,
            totalTiros3Intentados: t3I,
            totalTirosLibresAnotados: t1A,
            totalTirosLibresIntentados: t1I,
            totalMasMenos: totalMasMenos, // NEW
            avgMasMenos: gp > 0 ? totalMasMenos / gp : 0, // NEW
            // Si no ha jugado este año (GP=0), usamos PPG Carrera para evaluar su amenaza potencial
            ppg: gp > 0 ? totalPts / gp : 0, 
            mpg: gp > 0 ? totalMins / gp : 0, // Minutes per Game Current
            fpg: gp > 0 ? totalFouls / gp : 0, // FIXED: Now calculated
            ppm: gp > 0 && totalMins > 0 ? totalPts / totalMins : 0, // FIXED: Calculated or 0
            t1Pct: t1I > 0 ? (t1A / t1I) * 100 : 0, // Solo tenemos % de Libres
            last3PPG,
            lastGamesPlayed: lastGamesCount, // NEW: Tell frontend how many games are in the avg
            pointsShare,
            // Attach Career Stats
            careerStats: career,
            parallelStats: parallel
        } as PlayerAggregatedStats;
    }).filter(Boolean);

    // Ordenar por PPG para identificar líderes
    const sortedByPpg = [...playerStats].sort((a: PlayerAggregatedStats, b: PlayerAggregatedStats) => b.ppg - a.ppg);
    const topScorer = sortedByPpg[0] || null;
    
    // Top Shooter: Requiere volumen (>2 anotados) y frecuencia (>1.0 por partido) para no contar suerte.
    const topShooter = [...playerStats]
        .filter(p => p.totalTiros3Anotados > 2 && p.partidosJugados > 0 && (p.totalTiros3Anotados / p.partidosJugados) >= 1.0) 
        .sort((a: PlayerAggregatedStats, b: PlayerAggregatedStats) => b.totalTiros3Anotados - a.totalTiros3Anotados)[0] || null;

    // Bad FT Shooter: Hack-a-Shaq candidato. Mínimo 5 intentados para muestra fiable. <60% es crítico.
    const badFreeThrowShooter = [...playerStats]
        .filter(p => p.totalTirosLibresIntentados >= 5 && (p.t1Pct || 0) < 60) 
        .sort((a: PlayerAggregatedStats, b: PlayerAggregatedStats) => (a.t1Pct || 0) - (b.t1Pct || 0))[0] || null;


    // --- GENERACIÓN DE INSIGHTS & NARRATIVA TÁCTICA ---
    const insights: string[] = [];
    
    // 1. ANÁLISIS DE IDENTIDAD OFENSIVA (PACE & SPACE)
    if (teamAgg.ppg > 75) insights.push("🔥 Potencia Ofensiva: Equipo de alto ritmo (>75 PPG).");
    else if (teamAgg.ppg < 55) insights.push("🐌 Ritmo Lento: Anotación baja, suelen jugar a pocas posesiones y marcadores cortos.");
    
    if (teamAgg.t3PerGame > 7) insights.push("🎯 Dependencia Exterior: Su ataque prioriza el triple (>7 por partido).");

    // 2. ANÁLISIS DE AMENAZAS REALES (THREAT ASSESSMENT)
    const THREAT_THRESHOLD = 11.5;
    
    const realThreats = playerStats.filter(p => {
        if (p.ppg >= THREAT_THRESHOLD && p.partidosJugados >= 3) return true;
        if (p.partidosJugados > 0 && p.partidosJugados < 3 && p.ppg >= THREAT_THRESHOLD) {
             if (p.careerStats && p.careerStats.ppg > 10) return true;
        }
        if (p.careerStats && p.careerStats.ppg >= THREAT_THRESHOLD && p.careerStats.gamesPlayed > 10) return true;
        return false;
    }).sort((a: PlayerAggregatedStats, b: PlayerAggregatedStats) => {
        const ppgA = Math.max(a.ppg, a.careerStats?.ppg || 0);
        const ppgB = Math.max(b.ppg, b.careerStats?.ppg || 0);
        return ppgB - ppgA;
    });

    if (realThreats.length >= 3) {
        const names = realThreats.map(p => `${p.nombre} #${p.dorsal}`).slice(0, 3).join(', ');
        insights.push(`🐉 TRIDENTE OFENSIVO: Tienen 3 jugadores con capacidad probada de anotar >${THREAT_THRESHOLD} PPG (${names}).`);
    } else if (realThreats.length === 2) {
        insights.push(`⚡ DÚO DINÁMICO: ${realThreats[0].nombre} (#${realThreats[0].dorsal}) y ${realThreats[1].nombre} (#${realThreats[1].dorsal}) concentran todo el peligro ofensivo.`);
    } else if (realThreats.length === 1) {
        const threat = realThreats[0];
        if (topScorer && topScorer.pointsShare && topScorer.pointsShare > 30) {
            insights.push(`👑 SISTEMA HELIOCÉNTRICO: ${topScorer.nombre} (#${topScorer.dorsal}) anota el ${topScorer.pointsShare.toFixed(0)}% de los puntos del equipo. Frenarle es ganar el partido.`);
        } else {
             insights.push(`⭐ Referencia Clara: ${threat.nombre} (#${threat.dorsal}) es su única arma ofensiva consistente.`);
        }
    } else {
        insights.push("🛡️ Anotación Coral: No presentan individualidades dominantes (>11.5 PPG). El peligro viene del colectivo.");
    }

    // 3. ANÁLISIS DE IMPACTO (+/-) (NEW)
    const impactPlayer = playerStats.find(p => p.avgMasMenos && p.avgMasMenos > 8 && p.partidosJugados >= 3);
    if (impactPlayer) {
         insights.push(`🚀 FACTOR GANADOR: Cuando ${impactPlayer.nombre} (#${impactPlayer.dorsal}) está en pista, el equipo arrasa (+${impactPlayer.avgMasMenos!.toFixed(1)} de diferencial medio).`);
    }

    const emptyStats = playerStats.find(p => p.ppg > 10 && p.avgMasMenos && p.avgMasMenos < -2 && p.partidosJugados >= 3);
    if (emptyStats) {
         insights.push(`⚠️ ESTADÍSTICA VACÍA: ${emptyStats.nombre} (#${emptyStats.dorsal}) anota mucho (${emptyStats.ppg.toFixed(1)}), pero el equipo pierde con él en pista (${emptyStats.avgMasMenos!.toFixed(1)}).`);
    }

    const glueGuyPM = playerStats.find(p => p.ppg < 6 && p.avgMasMenos && p.avgMasMenos > 5 && p.partidosJugados >= 3);
    if (glueGuyPM) {
         insights.push(`🧱 CEMENTO: ${glueGuyPM.nombre} (#${glueGuyPM.dorsal}) no anota mucho, pero hace ganar al equipo (+${glueGuyPM.avgMasMenos!.toFixed(1)}). Imprescindible en defensa/intangibles.`);
    }

    // 4. DETECTORES DE ARQUETIPOS DE JUGADOR (DATA MINING)
    
    // NEW: Linked Player Detection (Prioritized)
    const linkedPlayer = playerStats.find(p => p.parallelStats && p.parallelStats.isPrimaryContext);
    if (linkedPlayer) {
         insights.push(`🔄 JUGADOR VINCULADO: ${linkedPlayer.nombre} (#${linkedPlayer.dorsal}) juega principalmente en otra categoría (${linkedPlayer.parallelStats?.gamesPlayed} partidos allí). No fiarse de sus estadísticas reducidas aquí.`);
         // Add warning if they are very good in the other category
         if (linkedPlayer.parallelStats && linkedPlayer.parallelStats.ppg > 15) {
             insights.push(`⚠️ ALERTA DE REFUERZO: ${linkedPlayer.nombre} (#${linkedPlayer.dorsal}) promedia ${linkedPlayer.parallelStats.ppg.toFixed(1)} puntos en su categoría principal. Es mucho más peligroso de lo que parece.`);
         }
    }

    const sleepingGiant = playerStats.find(p => p.ppg < 8 && p.careerStats && p.careerStats.ppg > 12 && p.careerStats.gamesPlayed > 15 && (!p.parallelStats || !p.parallelStats.isPrimaryContext));
    if (sleepingGiant) {
        insights.push(`💤 GIGANTE DORMIDO: Cuidado con ${sleepingGiant.nombre} (#${sleepingGiant.dorsal}). Solo promedia ${sleepingGiant.ppg.toFixed(1)} este año, pero es un anotador de ${sleepingGiant.careerStats?.ppg.toFixed(1)} PPG en su carrera.`);
    }

    const returningStar = playerStats.find(p => p.partidosJugados > 0 && p.partidosJugados < 3 && p.ppg > 12 && p.careerStats && p.careerStats.ppg > 10 && (!p.parallelStats || !p.parallelStats.isPrimaryContext));
    if (returningStar) {
        insights.push(`⚠️ FACTOR X / REGRESO: ${returningStar.nombre} (#${returningStar.dorsal}) ha jugado poco esta fase, pero promedia ${returningStar.ppg.toFixed(1)} pts y su histórico confirma que es una estrella. ¡Alerta máxima!`);
    }

    const historicalShooter = playerStats.find(p => {
        if (!p.careerStats) return false;
        const currentT3PerGame = p.partidosJugados > 0 ? p.totalTiros3Anotados / p.partidosJugados : 0;
        return p.careerStats.avgT3Made > 1.5 && currentT3PerGame < 1.0 && p.careerStats.gamesPlayed > 20;
    });
    
    if (historicalShooter) {
        insights.push(`🔫 FRANCOTIRADOR DORMIDO: No flotar a ${historicalShooter.nombre} (#${historicalShooter.dorsal}). Históricamente anota ${(historicalShooter.careerStats?.avgT3Made || 0).toFixed(1)} triples/partido, aunque ahora esté fallando.`);
    }

    // "The Engine" / "Intocable" (The Mini Basket Rule Key Player)
    // Plays a lot historically (>24 min) but scores low (<8 pts).
    const floorGeneral = playerStats.find(p => 
        p.careerStats && 
        p.careerStats.mpg > 24 && 
        p.careerStats.ppg < 8 &&
        p.careerStats.gamesPlayed > 15
    );
    if (floorGeneral) {
        insights.push(`🛡️ EL INTOCABLE / MOTOR: ${floorGeneral.nombre} (#${floorGeneral.dorsal}) es clave. Juega mucho históricamente (${floorGeneral.careerStats?.mpg.toFixed(0)} min/p) aunque no anote demasiado.`);
    }

    // "Veteran Presence" (Veteranía) - Enhanced with minutes check
    const veteran = playerStats.find(p => p.careerStats && p.careerStats.gamesPlayed > 50);
    if (veteran) {
        insights.push(`🎓 VETERANÍA: ${veteran.nombre} (#${veteran.dorsal}) aporta experiencia (${veteran.careerStats?.gamesPlayed} partidos y ${(veteran.careerStats?.totalMinutes || 0).toFixed(0)} minutos registrados).`);
    }

    const onFirePlayer = sortedByPpg.find(p => p.last3PPG && p.ppg > 5 && p.last3PPG > (p.ppg * 1.35));
    if (onFirePlayer) {
        insights.push(`🔥 EN RACHA: ${onFirePlayer.nombre} (#${onFirePlayer.dorsal}) promedia ${onFirePlayer.last3PPG?.toFixed(1)} en los últimos 3 partidos (vs ${onFirePlayer.ppg.toFixed(1)} media).`);
    }

    const sixthMan = playerStats.find(p => p.mpg < 22 && p.ppm > 0.45 && p.partidosJugados > 2);
    if (sixthMan) {
        insights.push(`🔌 MICROONDAS: ${sixthMan.nombre} (#${sixthMan.dorsal}) produce mucho en pocos minutos. Atentos cuando salga del banquillo.`);
    }

    // --- ANÁLISIS COMPARATIVO DEL PARTIDO (SI HAY RIVAL) ---
    let matchAnalysis;
    if (rivalId) {
        const rivalData = await fetchTeamStats(competicionId, rivalId);
        const rivalAgg = calculateTeamAggregates(rivalData.matches, rivalData.stats, rivalData.plantilla, rivalId);
        
        if (rivalAgg) {
            const rivalPlayerStats: PlayerAggregatedStats[] = rivalData.plantilla.map((p: any) => {
                const pStats = rivalData.stats.filter((s: EstadisticaJugadorPartido) => s && String(s.jugador_id) === String(p.jugador_id));
                const gp = pStats.length;
                if (gp === 0) return null;
                const totalPts = pStats.reduce((sum, s) => sum + (s.puntos || 0), 0);
                
                // Handle potential array response for jugadores
                const jugadorData = Array.isArray(p.jugadores) ? (p.jugadores as any)[0] : p.jugadores;

                return {
                    nombre: jugadorData?.nombre_completo,
                    dorsal: p.dorsal,
                    ppg: totalPts / gp,
                } as any;
            }).filter(Boolean).sort((a: any, b: any) => b.ppg - a.ppg);
            const rivalTopScorer = rivalPlayerStats[0];

            let prediction = "";
            const rawDiff = teamAgg.ppg - rivalAgg.ppg;
            
            if (rawDiff > 8) prediction = "Favorito claro por volumen de anotación (+8 PPG diferencia).";
            else if (rawDiff < -8) prediction = "Partido muy complicado. El rival anota significativamente más.";
            else if (Math.abs(rawDiff) < 3) prediction = "Empate técnico estadístico. Se decidirá por el acierto en T3 y rebote.";
            else prediction = teamAgg.ppg > rivalAgg.ppg ? "Ligera ventaja ofensiva." : "Desventaja ofensiva teórica.";

            let tempoAnalysis = "";
            const pace = teamAgg.ppg + rivalAgg.ppg;
            if (pace > 150) tempoAnalysis = "High Pace: Se espera un partido de transición rápida (>150 pts combinados).";
            else if (pace < 110) tempoAnalysis = "Grind-it-out: Partido defensivo y de posesiones largas (<110 pts combinados).";
            else tempoAnalysis = "Ritmo Estándar: Controlar las pérdidas será el factor diferencial.";

            let keyMatchup = "";
            if (topScorer && rivalTopScorer) {
                keyMatchup = `${topScorer.nombre} (#${topScorer.dorsal}) vs ${rivalTopScorer.nombre} (#${rivalTopScorer.dorsal}).`;
                if (Math.abs(topScorer.ppg - rivalTopScorer.ppg) < 2) keyMatchup += " Duelo de estrellas muy igualado.";
                else if (topScorer.ppg > rivalTopScorer.ppg) keyMatchup += " Tenéis al mejor jugador ofensivo de la pista.";
                else keyMatchup += " Su referencia ofensiva es superior estadísticamente.";
            }

            matchAnalysis = {
                prediction,
                tempoAnalysis,
                keyMatchup
            };
        }
    }

    return {
        teamStats: {
            ppg: teamAgg.ppg,
            papg: teamAgg.papg,
            t3PerGame: teamAgg.t3PerGame,
            ftPct: teamAgg.ftPct,
            last5Form: teamAgg.form
        },
        keyPlayers: {
            topScorer,
            topShooter,
            topRebounder: null,
            foulMagnet: null,
            badFreeThrowShooter
        },
        rosterStats: sortedByPpg, // Exportamos la lista ordenada para selección manual
        insights,
        matchAnalysis
    };
};
