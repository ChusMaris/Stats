
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
 * Calculates +/- (Plus Minus) and Minutes Played for players based on play-by-play movements
 */
const calculatePlusMinusFromMovements = (
    movements: any[], 
    myTeamPlayerIds: Set<string>,
    esMini: boolean,
    minsPerPeriod: number,
    matchIsLocal: Record<string, boolean>
) => {
    const playerPlusMinus: Record<string, number> = {};
    const playerSeconds: Record<string, number> = {};

    const movementsByMatch: Record<string, any[]> = {};
    movements.forEach(m => {
        const mid = String(m.partido_id);
        if (!movementsByMatch[mid]) movementsByMatch[mid] = [];
        movementsByMatch[mid].push(m);
    });

    Object.keys(movementsByMatch).forEach(matchId => {
        const isLocal = matchIsLocal[matchId];
        
        // 1. Sort Movements
        const matchMovs = movementsByMatch[matchId].sort((a, b) => {
            const pA = Number(a.periodo || 0);
            const pB = Number(b.periodo || 0);
            if (pA !== pB) return pA - pB;
            
            const mA = typeof a.minuto === 'number' ? a.minuto : parseInt(String(a.minuto).split(':')[0] || '0', 10);
            const mB = typeof b.minuto === 'number' ? b.minuto : parseInt(String(b.minuto).split(':')[0] || '0', 10);
            if (mA !== mB) return mB - mA; // Descending for time
            
            const sA = Number(a.segundo || 0);
            const sB = Number(b.segundo || 0);
            if (sA !== sB) return sB - sA; // Descending for time
            
            const typeA = parseInt(String(a.tipo_movimiento)) || 0;
            const typeB = parseInt(String(b.tipo_movimiento)) || 0;
            if (typeA !== typeB) return typeA - typeB;

            return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
        }).map((m, index) => ({ ...m, seq: index }));

        // 2. Identify Score Events
        const scoreEvents: Record<number, { deltaL: number, deltaV: number, score: string, period: number }> = {};
        let lastScore = { l: 0, v: 0, period: 0 };
        matchMovs.forEach(m => {
            const p = Number(m.periodo || 0);
            if (m.marcador && m.marcador.includes('-')) {
                const parts = m.marcador.split('-');
                const currL = parseInt(parts[0] || '0');
                const currV = parseInt(parts[1] || '0');
                
                let baseL = lastScore.l;
                let baseV = lastScore.v;

                if (p !== lastScore.period) {
                    if (esMini || (currL + currV) < (lastScore.l + lastScore.v)) {
                        baseL = 0;
                        baseV = 0;
                    }
                } else {
                    if ((currL + currV) < (lastScore.l + lastScore.v)) return;
                }

                const deltaL = currL - baseL;
                const deltaV = currV - baseV;

                if (deltaL !== 0 || deltaV !== 0) {
                    scoreEvents[m.seq] = { deltaL, deltaV, score: m.marcador, period: p };
                    lastScore = { l: currL, v: currV, period: p };
                }
            }
        });

        // 3. Identify Player Intervals (v4.0 Stint-Based Logic)
        const getSeconds = (m: any) => {
            const min = typeof m.minuto === 'number' ? m.minuto : parseInt(String(m.minuto).split(':')[0] || '0', 10);
            const sec = Number(m.segundo || 0);
            return min * 60 + sec;
        };

        const playerIntervals: Record<string, { startSeq: number, endSeq: number, period: number }[]> = {};
        const allPlayerIds = Array.from(new Set(matchMovs.map(m => String(m.jugador_id)).filter(id => id && id !== 'null')));
        const periodStartTime = minsPerPeriod * 60;

        const addIntervalsForStint = (pid: string, start: any, end: any) => {
            const startP = Number(start.periodo);
            const endP = Number(end.periodo);

            for (let p = startP; p <= endP; p++) {
                const pMoves = matchMovs.filter(m => Number(m.periodo) === p);
                if (pMoves.length === 0) continue;

                let sSeq = pMoves[0].seq;
                let eSeq = pMoves[pMoves.length - 1].seq;

                if (p === startP) sSeq = start.seq;
                if (p === endP) eSeq = end.seq;

                playerIntervals[pid].push({
                    startSeq: sSeq,
                    endSeq: eSeq,
                    period: p
                });
            }
        };

        allPlayerIds.forEach(pid => {
            playerIntervals[pid] = [];
            const isAidan = pid === '10862997-0bc4-4e16-b0e3-1557f3f7a6a6' && (matchId === 'f5bc4270-eedb-4712-96e9-f3ae051cf7e1' || matchId === 'e3701455-c1fc-4689-828d-374b84f631b8');

            // Get all sub events for this player sorted by sequence
            const allSubs = matchMovs
                .filter(m => String(m.jugador_id) === pid && ['112', '113', '115'].includes(String(m.tipo_movimiento)))
                .sort((a, b) => a.seq - b.seq);

            if (allSubs.length === 0) {
                // Fallback for players with no subs but other actions
                const otherActions = matchMovs.filter(m => String(m.jugador_id) === pid && !['112', '113', '115'].includes(String(m.tipo_movimiento)));
                if (otherActions.length > 0) {
                    const periodsWithActions = Array.from(new Set(otherActions.map(m => Number(m.periodo))));
                    periodsWithActions.forEach(p => {
                        const pMoves = matchMovs.filter(m => Number(m.periodo) === p);
                        if (pMoves.length > 0) {
                            playerIntervals[pid].push({
                                startSeq: pMoves[0].seq,
                                endSeq: pMoves[pMoves.length - 1].seq,
                                period: p
                            });
                        }
                    });
                }
                return;
            }

            // Apply the "Discard" logic from the SQL
            const filteredSubs = allSubs.filter((s, idx) => {
                if (String(s.tipo_movimiento) === '115' && getSeconds(s) === periodStartTime) {
                    if (idx > 0) {
                        const prev = allSubs[idx - 1];
                        if (Number(s.periodo) - Number(prev.period) === 1) {
                            if (isAidan) console.log(`[DEBUG AIDAN] Discarding 115 at 6:00 (P${s.periodo}) because prev sub was in P${prev.period}`);
                            return false;
                        }
                    }
                }
                return true;
            });

            if (isAidan) console.log(`[DEBUG AIDAN] Filtered Subs:`, filteredSubs.map(s => `${s.minuto}:${s.segundo} (P${s.periodo}) Type:${s.tipo_movimiento}`));

            // Build stints
            let currentStintStart: any | null = null;
            filteredSubs.forEach(s => {
                const type = String(s.tipo_movimiento);
                if (type === '112' || type === '113') {
                    if (!currentStintStart) currentStintStart = s;
                } else if (type === '115') {
                    if (currentStintStart) {
                        addIntervalsForStint(pid, currentStintStart, s);
                        currentStintStart = null;
                    }
                }
            });

            // If still in at the end of the match
            if (currentStintStart) {
                const lastMove = matchMovs[matchMovs.length - 1];
                addIntervalsForStint(pid, currentStintStart, lastMove);
            }
        });

        // 4. Calculate Stats
        Object.keys(playerIntervals).forEach(pid => {
            if (!myTeamPlayerIds.has(pid)) return;

            const key = `${String(matchId).toLowerCase()}_${String(pid).toLowerCase()}`;
            let pm = 0;
            let totalSecs = 0;

            const isAidan = pid === '10862997-0bc4-4e16-b0e3-1557f3f7a6a6' && (matchId === 'f5bc4270-eedb-4712-96e9-f3ae051cf7e1' || matchId === 'e3701455-c1fc-4689-828d-374b84f631b8');
            
            playerIntervals[pid].forEach((interval, idx) => {
                // Calculate Seconds
                const startMove = matchMovs.find(m => m.seq === interval.startSeq);
                const endMove = matchMovs.find(m => m.seq === interval.endSeq);
                if (startMove && endMove) {
                    const s1 = getSeconds(startMove);
                    const s2 = getSeconds(endMove);
                    totalSecs += Math.abs(s1 - s2);
                }

                if (isAidan) console.log(`  Interval ${idx} (P${interval.period}): [seq:${interval.startSeq} - seq:${interval.endSeq}]`);

                Object.keys(scoreEvents).forEach(sSeqStr => {
                    const sSeq = parseInt(sSeqStr);
                    const scoreEv = scoreEvents[sSeq];
                    const included = sSeq > interval.startSeq && sSeq <= interval.endSeq;
                    
                    if (isAidan) {
                        const scoreMov = matchMovs.find(m => m.seq === sSeq);
                        const timeStr = scoreMov ? `${scoreMov.minuto}:${scoreMov.segundo}` : '??';
                        if (included) {
                            const impact = isLocal ? (scoreEv.deltaL - scoreEv.deltaV) : (scoreEv.deltaV - scoreEv.deltaL);
                            pm += impact;
                            console.log(`    Score ${scoreEv.score} @ ${timeStr} (P${scoreEv.period}, seq:${sSeq}) -> INCLUDED. Impact:${impact}, RunningPM:${pm}`);
                        } else if (scoreEv.period === interval.period) {
                            console.log(`    Score ${scoreEv.score} @ ${timeStr} (P${scoreEv.period}, seq:${sSeq}) -> EXCLUDED. Outside interval [${interval.startSeq}-${interval.endSeq}]`);
                        }
                    } else if (included) {
                        const impact = isLocal ? (scoreEv.deltaL - scoreEv.deltaV) : (scoreEv.deltaV - scoreEv.deltaL);
                        pm += impact;
                    }
                });
            });

            playerPlusMinus[key] = pm;
            playerSeconds[key] = totalSecs;
            if (isAidan) console.log(`[DEBUG AIDAN] Final Calculated PM: ${pm}, Secs: ${totalSecs}`);
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
    let viewPlusMinus: Record<string, number> = {};

    if (matchIds.length > 0) {
        console.log(`[DBStats v6.3] Fetching View PM for ${matchIds.length} matches...`);
        console.log(`[DBStats v6.3] Match IDs:`, matchIds);
        
        // 1. Fetch View PM - Using lowercase name as suggested by Supabase hint
        const viewResponse = await supabase
            .from('vw_kpi_plusminus')
            .select('*')
            .in('partido_id', matchIds);
        
        console.log(`[DBStats v6.3] View Response:`, { 
            error: viewResponse.error, 
            count: viewResponse.data?.length,
            status: viewResponse.status,
            statusText: viewResponse.statusText
        });

        if (viewResponse.error) {
            console.error(`[DBStats v6.3] Error fetching from vw_kpi_plusminus:`, {
                message: viewResponse.error.message,
                details: viewResponse.error.details,
                hint: viewResponse.error.hint,
                code: viewResponse.error.code
            });
        } else if (viewResponse.data) {
            console.log(`[DBStats v6.3] View Data Raw:`, viewResponse.data.slice(0, 2));
            viewResponse.data.forEach((row: any) => {
                const pId = row.partido_id || row.id_partido || row.partido;
                const jId = row.jugador_id || row.id_jugador || row.jugador;
                const val = row.kpi_mas_menos !== undefined ? row.kpi_mas_menos : row.plusminus;

                if (pId && jId) {
                    const key = `${String(pId).toLowerCase()}_${String(jId).toLowerCase()}`;
                    viewPlusMinus[key] = Number(val || 0);
                }
            });
            console.log(`[DBStats v6.3] Loaded ${Object.keys(viewPlusMinus).length} PM records from view.`);
        }

        // 2. Fetch movements match by match to avoid the 1000 row limit per request
        for (const mid of matchIds) {
            const movsResponse = await supabase
                .from('partido_movimientos')
                .select('*')
                .eq('partido_id', mid)
                .order('periodo')
                .order('minuto', { ascending: false })
                .order('segundo', { ascending: false });
            
            if (!movsResponse.error) {
                movementsData = [...movementsData, ...(movsResponse.data || [])];
            }
        }
        console.log(`[DBStats v6.3] Total movements fetched: ${movementsData.length}`);
    }

    // --- CALCULATE PLUS MINUS & MINUTES ---
    const myTeamPlayerIds = new Set<string>(plantillaResponse.data?.map((p: any) => String(p.jugador_id)) || []);
    
    const matchIsLocal: Record<string, boolean> = {};
    matches.forEach((m: any) => {
        matchIsLocal[String(m.id)] = String(m.equipo_local_id) === String(equipoId);
    });

    console.log(`[DBStats v6.3] Pure View Mode: Relying on vw_kpi_plusminus for PM`);
    const { playerSeconds } = calculatePlusMinusFromMovements(movementsData, myTeamPlayerIds, esMini, minsPerPeriod, matchIsLocal);

    // Final Injection
    const finalStats = statsData.map((s: EstadisticaJugadorPartido) => {
        const key = `${String(s.partido_id).toLowerCase()}_${String(s.jugador_id).toLowerCase()}`;
        const seconds = playerSeconds[key] || 0;
        
        // Format seconds to MM:SS
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        // STRICT VIEW MODE: Use View PM if available, otherwise fallback to DB value. No local calculations.
        const finalPM = viewPlusMinus[key] !== undefined ? viewPlusMinus[key] : (s.mas_menos || 0);

        if (String(s.jugador_id) === '10862997-0bc4-4e16-b0e3-1557f3f7a6a6') {
             console.log(`[DEBUG AIDAN] Match ${s.partido_id}: View PM=${viewPlusMinus[key]}, DB PM=${s.mas_menos}, Final=${finalPM}`);
        }

        return {
            ...s,
            mas_menos: finalPM,
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
            if (myPts > oppPts) return 'W';
            if (myPts < oppPts) return 'L';
            return 'D';
        })
        .reverse();

    return {
        avgPoints: totalPoints / totalMatches,
        avgPointsAgainst: totalPointsAgainst / totalMatches,
        t3MadePerGame: totalT3Made / totalMatches,
        t1Pct: totalT1Att > 0 ? (totalT1Made / totalT1Att) * 100 : 0,
        form
    };
};

export const getTeamScoutingReport = async (competicionId: number | string, equipoId: number | string, rivalId?: number | string): Promise<ScoutingReport> => {
    // 1. Fetch Basic Info
    const { data: team, error: teamError } = await supabase
        .from('equipos')
        .select('*, clubs:clubs!equipos_club_id_fkey(*)')
        .eq('id', equipoId)
        .single();
    
    if (teamError) throw teamError;

    const { data: comp, error: compError } = await supabase
        .from('competiciones')
        .select('*, temporadas(*)')
        .eq('id', competicionId)
        .single();
    
    if (compError) throw compError;

    // 2. Fetch Matches & Stats
    const { realMatches } = await fetchCompeticionDetails(competicionId);
    
    // Filter stats for this specific team
    const { stats, plantilla } = await fetchTeamStats(competicionId, equipoId);

    const plantillaPlayerIds = new Set((plantilla || []).map((p: any) => String(p.jugador_id)));
    const teamStatsOnly = (stats || []).filter((s: any) => {
        const playerId = String(s.jugador_id);
        if (plantillaPlayerIds.size > 0) {
            return plantillaPlayerIds.has(playerId);
        }
        if (s.equipo_id !== undefined && s.equipo_id !== null) {
            return String(s.equipo_id) === String(equipoId);
        }
        return true;
    });

    // 3. Calculate Team Aggregates
    const aggregates = calculateTeamAggregates(realMatches, teamStatsOnly, plantilla, equipoId);

    // 4. Identify Key Players
    const playerStats: Record<string, PlayerAggregatedStats> = {};
    
    teamStatsOnly.forEach((s: any) => {
        const pid = String(s.jugador_id);
        if (!playerStats[pid]) {
            const pInfo = plantilla.find(p => String(p.jugador_id) === pid);
            const jugadorInfo = pInfo?.jugadores || {};
            const fullNameFromParts = [jugadorInfo?.nombre, jugadorInfo?.apellido].filter(Boolean).join(' ').trim();
            const displayName = fullNameFromParts || jugadorInfo?.nombre_completo || jugadorInfo?.name || `Jugador ${pid.slice(0, 8)}`;
            playerStats[pid] = {
                jugadorId: pid,
                nombre: displayName,
                dorsal: String(pInfo?.dorsal || '0'),
                fotoUrl: jugadorInfo?.foto_url || jugadorInfo?.fotoUrl,
                partidosJugados: 0,
                totalPuntos: 0,
                ppg: 0,
                totalTiros3Anotados: 0,
                totalTiros3Intentados: 0,
                totalTirosLibresAnotados: 0,
                totalTirosLibresIntentados: 0,
                totalFaltas: 0,
                totalFaltasTiro: 0,
                totalTiros2Intentados: 0,
                totalTiros2Anotados: 0,
                totalMinutos: 0,
                mpg: 0,
                fpg: 0,
                ppm: 0
            };
        }
        const ps = playerStats[pid];
        ps.partidosJugados++;
        ps.totalPuntos += (s.puntos || 0);
        ps.totalTiros3Anotados += (s.t3_anotados || 0);
        ps.totalTiros3Intentados += (s.t3_intentados || 0);
        ps.totalTirosLibresAnotados += (s.t1_anotados || 0);
        ps.totalTirosLibresIntentados += (s.t1_intentados || 0);
        ps.totalFaltas += (s.faltas_cometidas || 0);
        ps.totalMinutos += parseTiempoJugado(s.tiempo_jugado);
    });

    Object.values(playerStats).forEach(ps => {
        ps.ppg = ps.partidosJugados > 0 ? ps.totalPuntos / ps.partidosJugados : 0;
        ps.mpg = ps.partidosJugados > 0 ? ps.totalMinutos / ps.partidosJugados : 0;
        ps.fpg = ps.partidosJugados > 0 ? ps.totalFaltas / ps.partidosJugados : 0;
        ps.ppm = ps.totalMinutos > 0 ? ps.totalPuntos / ps.totalMinutos : 0;
        ps.t1Pct = ps.totalTirosLibresIntentados > 0 ? (ps.totalTirosLibresAnotados / ps.totalTirosLibresIntentados) * 100 : 0;
    });

    const sortedByPPG = Object.values(playerStats).sort((a, b) => b.ppg - a.ppg);
    const topScorer = sortedByPPG[0] || null;
    
    const topShooter = Object.values(playerStats)
        .sort((a, b) => (b.totalTiros3Anotados / (b.partidosJugados || 1)) - (a.totalTiros3Anotados / (a.partidosJugados || 1)))[0] || null;

    const foulMagnet = Object.values(playerStats)
        .sort((a, b) => (b.totalTirosLibresIntentados / (b.partidosJugados || 1)) - (a.totalTirosLibresIntentados / (a.partidosJugados || 1)))[0] || null;

    const badFreeThrowShooter = Object.values(playerStats)
        .filter(p => p.totalTirosLibresIntentados > 5)
        .sort((a, b) => (a.t1Pct || 0) - (b.t1Pct || 0))[0] || null;

    // 5. Fetch Historical & Parallel Context
    const playerIds = Object.keys(playerStats);
    const careerContext = await fetchHistoricalPlayerStats(playerIds);
    const parallelContext = await fetchParallelPlayerStats(comp.temporada_id, competicionId, playerIds);

    // Enrich player stats with context
    Object.values(playerStats).forEach(ps => {
        ps.careerStats = careerContext[String(ps.jugadorId)];
        ps.parallelStats = parallelContext[String(ps.jugadorId)];
    });

    let matchAnalysis: ScoutingReport['matchAnalysis'] | undefined;

    if (rivalId !== undefined && rivalId !== null) {
        const { stats: rivalStatsRaw, plantilla: rivalPlantilla } = await fetchTeamStats(competicionId, rivalId);
        const rivalPlantillaIds = new Set((rivalPlantilla || []).map((p: any) => String(p.jugador_id)));
        const rivalStatsOnly = (rivalStatsRaw || []).filter((s: any) => {
            const playerId = String(s.jugador_id);
            if (rivalPlantillaIds.size > 0) {
                return rivalPlantillaIds.has(playerId);
            }
            if (s.equipo_id !== undefined && s.equipo_id !== null) {
                return String(s.equipo_id) === String(rivalId);
            }
            return true;
        });

        const rivalAggregates = calculateTeamAggregates(realMatches, rivalStatsOnly, rivalPlantilla, rivalId);

        const rivalPlayerStats: Record<string, { nombre: string; partidosJugados: number; totalPuntos: number; ppg: number }> = {};
        rivalStatsOnly.forEach((s: any) => {
            const pid = String(s.jugador_id);
            if (!rivalPlayerStats[pid]) {
                const pInfo = (rivalPlantilla || []).find((p: any) => String(p.jugador_id) === pid);
                const jugadorInfo = pInfo?.jugadores || {};
                const fullNameFromParts = [jugadorInfo?.nombre, jugadorInfo?.apellido].filter(Boolean).join(' ').trim();
                rivalPlayerStats[pid] = {
                    nombre: fullNameFromParts || jugadorInfo?.nombre_completo || jugadorInfo?.name || `Jugador ${pid.slice(0, 8)}`,
                    partidosJugados: 0,
                    totalPuntos: 0,
                    ppg: 0
                };
            }
            rivalPlayerStats[pid].partidosJugados += 1;
            rivalPlayerStats[pid].totalPuntos += (s.puntos || 0);
        });

        Object.values(rivalPlayerStats).forEach((p) => {
            p.ppg = p.partidosJugados > 0 ? p.totalPuntos / p.partidosJugados : 0;
        });

        const rivalTopScorer = Object.values(rivalPlayerStats).sort((a, b) => b.ppg - a.ppg)[0] || null;

        const myProjected = aggregates && rivalAggregates ? ((aggregates.avgPoints + rivalAggregates.avgPointsAgainst) / 2) : null;
        const rivalProjected = aggregates && rivalAggregates ? ((rivalAggregates.avgPoints + aggregates.avgPointsAgainst) / 2) : null;

        const projectionGap = (myProjected !== null && rivalProjected !== null)
            ? myProjected - rivalProjected
            : null;

        const prediction = (myProjected !== null && rivalProjected !== null)
            ? (myProjected >= rivalProjected
                ? `${team.nombre_especifico} parte con ligera ventaja (${myProjected.toFixed(1)} - ${rivalProjected.toFixed(1)}). Si mantiene el ritmo de anotación y cierra su aro, debería llegar con opciones al final.`
                : `${team.nombre_especifico} llega como underdog (${myProjected.toFixed(1)} - ${rivalProjected.toFixed(1)}). El plan pasa por bajar el ritmo y castigar cada pérdida rival.`)
            : 'Pronóstico abierto: partido de detalles, ejecución en media pista y control emocional en los últimos minutos.';

        const keyMatchup = topScorer && rivalTopScorer
            ? `Emparejamiento crítico: ${topScorer.nombre} (${topScorer.ppg.toFixed(1)} ppp) contra ${rivalTopScorer.nombre} (${rivalTopScorer.ppg.toFixed(1)} ppp). Forzar recepciones lejos de ventaja puede inclinar el partido.`
            : 'Duelo clave: contener al primer creador rival y asegurar rebote defensivo para cortar segundas opciones.';

        const totalExpectedPoints = (myProjected || 0) + (rivalProjected || 0);
        const tempoAnalysis = totalExpectedPoints > 145
            ? `Ritmo alto previsto (${totalExpectedPoints.toFixed(0)} pts combinados). Prioridad: balance defensivo inmediato y buena toma de decisiones en transición.`
            : totalExpectedPoints > 125
                ? `Ritmo medio previsto (${totalExpectedPoints.toFixed(0)} pts combinados). Clave táctica: calidad de bloqueos directos y disciplina en ayudas cortas.`
                : `Ritmo bajo previsto (${totalExpectedPoints.toFixed(0)} pts combinados). Cada posesión pesa mucho: minimizar pérdidas y cargar el rebote ofensivo con criterio.`;

        if (projectionGap !== null && Math.abs(projectionGap) < 3) {
            matchAnalysis = {
                prediction: `${prediction} Se espera final cerrado, con alto valor de las últimas 4-5 posesiones.`,
                keyMatchup,
                tempoAnalysis
            };
        } else {
            matchAnalysis = {
                prediction,
                keyMatchup,
                tempoAnalysis
            };
        }
    }

    const insights: string[] = [];
    if (topScorer) insights.push(`El máximo anotador es ${topScorer.nombre} con ${topScorer.ppg.toFixed(1)} puntos por partido.`);
    if (aggregates) insights.push(`El equipo anota una media de ${aggregates.avgPoints.toFixed(1)} puntos y recibe ${aggregates.avgPointsAgainst.toFixed(1)}.`);
    if (foulMagnet) insights.push(`${foulMagnet.nombre} fuerza ${((foulMagnet.totalTirosLibresIntentados || 0) / Math.max(foulMagnet.partidosJugados || 1, 1)).toFixed(1)} tiros libres por partido.`);

    return {
        teamStats: {
            ppg: aggregates?.avgPoints || 0,
            papg: aggregates?.avgPointsAgainst || 0,
            t3PerGame: aggregates?.t3MadePerGame || 0,
            ftPct: aggregates?.t1Pct || 0,
            last5Form: aggregates?.form || []
        },
        keyPlayers: {
            topScorer,
            topShooter,
            topRebounder: null,
            foulMagnet,
            badFreeThrowShooter: (badFreeThrowShooter && (badFreeThrowShooter.t1Pct || 0) < 50) ? badFreeThrowShooter : null
        },
        rosterStats: Object.values(playerStats).sort((a, b) => b.ppg - a.ppg),
        insights,
        matchAnalysis
    };
};

export const fetchCareerStats = async (jugadorId: string | number): Promise<CareerStats | null> => {
    const context = await fetchHistoricalPlayerStats([jugadorId]);
    return context[String(jugadorId)] || null;
};
