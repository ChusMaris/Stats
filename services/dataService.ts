
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

export const fetchCompeticionDetails = async (competicionId: number | string) => {
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
    equipos: teamsResponse.data
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
const calculatePlusMinusFromMovements = (movements: PartidoMovimiento[], allStats: EstadisticaJugadorPartido[], myTeamPlayerIds: Set<string>) => {
    // Map to store +/- for each player in this match (Key: PlayerID, Value: +/-)
    const playerPlusMinus: Record<string, number> = {};
    
    // Group movements by Match ID to process each game independently
    const movementsByMatch: Record<string, PartidoMovimiento[]> = {};
    movements.forEach(m => {
        const mid = String(m.partido_id);
        if (!movementsByMatch[mid]) movementsByMatch[mid] = [];
        movementsByMatch[mid].push(m);
    });

    // Helper: Identify which team a player belongs to
    // We use allStats (which contains both teams) to map PlayerID -> MatchID (to check consistency)
    // But mainly we rely on 'myTeamPlayerIds' to know if Ally or Enemy.
    const getTeamSide = (pid: string): 'MY_TEAM' | 'OPPONENT' => {
        return myTeamPlayerIds.has(pid) ? 'MY_TEAM' : 'OPPONENT';
    };

    // Iterate through each match
    Object.keys(movementsByMatch).forEach(matchId => {
        const matchMovs = movementsByMatch[matchId].sort((a, b) => (Number(a.id) - Number(b.id))); // Sort chronologically by ID
        
        // Track active players on court
        const onCourtMyTeam = new Set<string>();
        const onCourtOpponent = new Set<string>();

        // Init player scores for this match
        // Note: We only care about calculating for MY team players, but we need to track opponent lineup to be precise if we wanted full stats
        // For now, we just update the map for players we care about.

        matchMovs.forEach(mov => {
            const desc = (mov.descripcion || '').toLowerCase();
            const pid = String(mov.jugador_id);
            const tipo = String(mov.tipo_movimiento || '');
            const side = getTeamSide(pid);

            // 1. Handle Substitutions (Entra / Sale) using Codes 112/115 and text fallback
            const isEntry = tipo === '112' || desc.includes('entra') || desc.includes('in') || desc.includes('enter');
            const isExit = tipo === '115' || desc.includes('sale') || desc.includes('surt') || desc.includes('out') || desc.includes('leave');

            if (isEntry) {
                if (side === 'MY_TEAM') onCourtMyTeam.add(pid);
                else onCourtOpponent.add(pid);
                
                // Init value if not exists
                if (!playerPlusMinus[pid]) playerPlusMinus[pid] = 0;
            } 
            else if (isExit) {
                if (side === 'MY_TEAM') onCourtMyTeam.delete(pid);
                else onCourtOpponent.delete(pid);
            }
            // 1.5 FAULT TOLERANCE: If a player does ANY action, they must be on court
            else {
                if (side === 'MY_TEAM' && !onCourtMyTeam.has(pid)) {
                     onCourtMyTeam.add(pid);
                     // If they weren't tracked, init to 0
                     if (!playerPlusMinus[pid]) playerPlusMinus[pid] = 0;
                }
            }

            // 2. Handle Scoring (Puntos)
            // Use specific codes first, then text fallback
            let points = 0;
            if (tipo === '92') points = 1;      // Tiro Libre
            else if (tipo === '93') points = 2; // T2
            else if (tipo === '94') points = 3; // T3
            else {
                 // Fallback text detection
                 if (desc.includes('anotado') || desc.includes('anotat') || desc.includes('made') || 
                     desc.includes('mate') || desc.includes('esmaixada') || desc.includes('dunk') ||
                     desc.includes('transformado') || desc.includes('transforma') || 
                     desc.includes('converteix') || desc.includes('convertido') || 
                     desc.includes('encestado') || desc.includes('encesta') ||
                     desc.includes('canasta') || desc.includes('cistella') ||
                     desc.includes('bandeja')) {
                     
                     points = 2; // Default
                     if (desc.includes('triple') || desc.includes('3pt')) points = 3;
                     else if (desc.includes('libre') || desc.includes('lliure') || desc.includes('free throw') || desc.includes('tl anotado')) points = 1;
                 }
            }

            if (points > 0) {
                // If MY TEAM scored
                if (side === 'MY_TEAM') {
                    // Add (+) to My Team players on court
                    onCourtMyTeam.forEach(p => {
                        playerPlusMinus[p] = (playerPlusMinus[p] || 0) + points;
                    });
                } 
                // If OPPONENT TEAM scored
                else {
                    // Subtract (-) from My Team players on court
                    onCourtMyTeam.forEach(p => {
                        playerPlusMinus[p] = (playerPlusMinus[p] || 0) - points;
                    });
                }
            }
        });
    });

    return playerPlusMinus;
};

export const fetchTeamStats = async (competicionId: number | string, equipoId: number | string) => {
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

    const matchIds = (matchesResponse.data || []).map(m => m.id);

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

    // --- CALCULATE PLUS MINUS ---
    const myTeamPlayerIds = new Set(plantillaResponse.data?.map(p => String(p.jugador_id)) || []);
    // Note: We don't use the aggregated result directly for per-match stats, we re-run logic granularly below
    // But we could use it for verification.
    
    // Re-run simple calculator with MatchID context
    const pmMap: Record<string, number> = {}; // Key: MatchID_PlayerID
    
    // Quick inline re-processing for granular mapping
    const movementsByMatch: Record<string, PartidoMovimiento[]> = {};
    movementsData.forEach(m => {
        const mid = String(m.partido_id);
        if (!movementsByMatch[mid]) movementsByMatch[mid] = [];
        movementsByMatch[mid].push(m);
    });

    Object.keys(movementsByMatch).forEach(mid => {
        const movs = movementsByMatch[mid].sort((a, b) => Number(a.id) - Number(b.id));
        const onCourt = new Set<string>();
        const localPM: Record<string, number> = {};

        movs.forEach(m => {
             const desc = (m.descripcion || '').toLowerCase();
             const pid = String(m.jugador_id);
             const tipo = String(m.tipo_movimiento || '');
             
             // 1. Check Subsitutions with CODES
             const isEntry = tipo === '112' || desc.includes('entra') || desc.includes('in');
             const isExit = tipo === '115' || desc.includes('sale') || desc.includes('surt') || desc.includes('out');

             if (isEntry) {
                 if (myTeamPlayerIds.has(pid)) onCourt.add(pid);
                 if (!localPM[pid]) localPM[pid] = 0; // Initialize to 0 so we don't return null
             }
             else if (isExit) {
                 onCourt.delete(pid);
             }
             // 1.5 FAULT TOLERANCE: If my player acts, they are on court
             else if (myTeamPlayerIds.has(pid) && !onCourt.has(pid)) {
                 onCourt.add(pid);
                 if (!localPM[pid]) localPM[pid] = 0; // Initialize to 0 so we don't return null
             }

             // 2. Scoring
             // Prioritize Codes (92, 93, 94)
             let pts = 0;
             if (tipo === '92') pts = 1;
             else if (tipo === '93') pts = 2;
             else if (tipo === '94') pts = 3;
             else {
                 // Fallback text detection
                 if (desc.includes('anotado') || desc.includes('anotat') || desc.includes('made') || 
                     desc.includes('mate') || desc.includes('esmaixada') || desc.includes('dunk') ||
                     desc.includes('transformado') || desc.includes('transforma') || 
                     desc.includes('converteix') || desc.includes('convertido') || 
                     desc.includes('encestado') || desc.includes('encesta') ||
                     desc.includes('canasta') || desc.includes('cistella') ||
                     desc.includes('bandeja')) {
                     
                     pts = 2;
                     if (desc.includes('triple') || desc.includes('3pt')) pts = 3;
                     else if (desc.includes('libre') || desc.includes('lliure')) pts = 1;
                 }
             }

             if (pts > 0) {
                 // Determine who scored
                 const scorerIsMyTeam = myTeamPlayerIds.has(pid);
                 
                 // If my team scored
                 if (scorerIsMyTeam) {
                     onCourt.forEach(activePid => {
                         localPM[activePid] = (localPM[activePid] || 0) + pts;
                     });
                 } else {
                     // Opponent scored
                     onCourt.forEach(activePid => {
                         localPM[activePid] = (localPM[activePid] || 0) - pts;
                     });
                 }
             }
        });

        // Store to global map
        Object.keys(localPM).forEach(pid => {
            pmMap[`${mid}_${pid}`] = localPM[pid];
        });
    });

    // Final Injection
    // IMPORTANT: If pmMap is undefined, default to 0 to avoid UI dashes unless strictly necessary
    const finalStats = statsData.map(s => ({
        ...s,
        mas_menos: pmMap[`${s.partido_id}_${s.jugador_id}`] ?? (s.mas_menos || 0)
    }));

    return {
        matches: matchesResponse.data,
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

    (allStats || []).forEach(stat => {
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
    
    // Note: Supabase JS joins can be tricky. We'll try to fetch stats where the associated match meets criteria.
    const { data: parallelData, error } = await supabase
        .from('estadisticas_jugador_partido')
        .select(`
            jugador_id,
            puntos,
            partido:partidos!inner (
                id,
                competicion_id,
                temporada_id,
                competiciones (nombre)
            )
        `)
        .in('jugador_id', playerIds)
        // @ts-ignore - Supabase types might not perfectly reflect deep filtering syntax here but it works
        .eq('partido.temporada_id', seasonId)
        .neq('partido.competicion_id', currentCompId);

    if (error) {
        console.error("Error fetching parallel stats", error);
        return {};
    }

    const parallel: Record<string, ParallelStats> = {};
    
    (parallelData || []).forEach((item: any) => {
        const pid = String(item.jugador_id);
        const p = item.partido;
        // Skip if somehow the filter didn't work (paranoid check)
        if (String(p.competicion_id) === String(currentCompId)) return;

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
        
        const compName = p.competiciones?.nombre;
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

    playedMatches.forEach(m => {
        const isLocal = String(m.equipo_local_id) === String(equipoId);
        const myPts = isLocal ? (m.puntos_local || 0) : (m.puntos_visitante || 0);
        const oppPts = isLocal ? (m.puntos_visitante || 0) : (m.puntos_local || 0);
        
        totalPoints += myPts;
        totalPointsAgainst += oppPts;
    });

    stats.forEach(s => {
        if(String(s.id).includes('ignore')) return; 
        totalT3Made += (s.t3_anotados || 0);
        totalT1Made += (s.t1_anotados || 0);
        totalT1Att += (s.t1_intentados || 0);
    });

    // Sort by Date Descending
    const sortedMatches = playedMatches.sort((a, b) => new Date(b.fecha_hora || 0).getTime() - new Date(a.fecha_hora || 0).getTime());

    const form = sortedMatches
        .slice(0, 5) 
        .map(m => {
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
        sortedMatchesIds: sortedMatches.map(m => m.id)
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
    const playerIds = plantilla.map(p => p.jugador_id).filter(Boolean);
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
    const playerStats: PlayerAggregatedStats[] = plantilla.map(p => {
        if (!p) return null;
        const pStats = stats.filter(s => s && String(s.jugador_id) === String(p.jugador_id));
        const pMovements = movements.filter(m => m && String(m.jugador_id) === String(p.jugador_id));
        
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
        const pStatsSorted = [...pStats].sort((a, b) => {
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
    const sortedByPpg = [...playerStats].sort((a, b) => b.ppg - a.ppg);
    const topScorer = sortedByPpg[0] || null;
    
    // Top Shooter: Requiere volumen (>2 anotados) y frecuencia (>1.0 por partido) para no contar suerte.
    const topShooter = [...playerStats]
        .filter(p => p.totalTiros3Anotados > 2 && p.partidosJugados > 0 && (p.totalTiros3Anotados / p.partidosJugados) >= 1.0) 
        .sort((a, b) => b.totalTiros3Anotados - a.totalTiros3Anotados)[0] || null;

    // Bad FT Shooter: Hack-a-Shaq candidato. Mínimo 5 intentados para muestra fiable. <60% es crítico.
    const badFreeThrowShooter = [...playerStats]
        .filter(p => p.totalTirosLibresIntentados >= 5 && (p.t1Pct || 0) < 60) 
        .sort((a, b) => (a.t1Pct || 0) - (b.t1Pct || 0))[0] || null;


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
    }).sort((a, b) => {
        const ppgA = Math.max(a.ppg, a.careerStats?.ppg || 0);
        const ppgB = Math.max(b.ppg, b.careerStats?.ppg || 0);
        return ppgB - ppgA;
    });

    if (realThreats.length >= 3) {
        const names = realThreats.map(p => `${p.nombre} #${p.dorsal}`).slice(0, 3).join(', ');
        insights.push(`🐉 TRIDENTE OFENSIVO: Tienen 3 jugadores con capacidad probada de anotar >${THREAT_THRESHOLD} PPG (${names}).`);
    } else if (realThreats.length === 2) {
        insights.push(`⚡ DÚO DINÁMICO: ${realThreats[0].nombre} y ${realThreats[1].nombre} concentran todo el peligro ofensivo.`);
    } else if (realThreats.length === 1) {
        const threat = realThreats[0];
        if (topScorer && topScorer.pointsShare && topScorer.pointsShare > 30) {
            insights.push(`👑 SISTEMA HELIOCÉNTRICO: ${topScorer.nombre} anota el ${topScorer.pointsShare.toFixed(0)}% de los puntos del equipo. Frenarle es ganar el partido.`);
        } else {
             insights.push(`⭐ Referencia Clara: ${threat.nombre} es su única arma ofensiva consistente.`);
        }
    } else {
        insights.push("🛡️ Anotación Coral: No presentan individualidades dominantes (>11.5 PPG). El peligro viene del colectivo.");
    }

    // 3. ANÁLISIS DE IMPACTO (+/-) (NEW)
    const impactPlayer = playerStats.find(p => p.avgMasMenos && p.avgMasMenos > 8 && p.partidosJugados >= 3);
    if (impactPlayer) {
         insights.push(`🚀 FACTOR GANADOR: Cuando ${impactPlayer.nombre} está en pista, el equipo arrasa (+${impactPlayer.avgMasMenos!.toFixed(1)} de diferencial medio).`);
    }

    const emptyStats = playerStats.find(p => p.ppg > 10 && p.avgMasMenos && p.avgMasMenos < -2 && p.partidosJugados >= 3);
    if (emptyStats) {
         insights.push(`⚠️ ESTADÍSTICA VACÍA: ${emptyStats.nombre} anota mucho (${emptyStats.ppg.toFixed(1)}), pero el equipo pierde con él en pista (${emptyStats.avgMasMenos!.toFixed(1)}).`);
    }

    const glueGuyPM = playerStats.find(p => p.ppg < 6 && p.avgMasMenos && p.avgMasMenos > 5 && p.partidosJugados >= 3);
    if (glueGuyPM) {
         insights.push(`🧱 CEMENTO: ${glueGuyPM.nombre} no anota mucho, pero hace ganar al equipo (+${glueGuyPM.avgMasMenos!.toFixed(1)}). Imprescindible en defensa/intangibles.`);
    }

    // 4. DETECTORES DE ARQUETIPOS DE JUGADOR (DATA MINING)
    
    // NEW: Linked Player Detection (Prioritized)
    const linkedPlayer = playerStats.find(p => p.parallelStats && p.parallelStats.isPrimaryContext);
    if (linkedPlayer) {
         insights.push(`🔄 JUGADOR VINCULADO: ${linkedPlayer.nombre} (#${linkedPlayer.dorsal}) juega principalmente en otra categoría (${linkedPlayer.parallelStats?.gamesPlayed} partidos allí). No fiarse de sus estadísticas reducidas aquí.`);
         // Add warning if they are very good in the other category
         if (linkedPlayer.parallelStats && linkedPlayer.parallelStats.ppg > 15) {
             insights.push(`⚠️ ALERTA DE REFUERZO: ${linkedPlayer.nombre} promedia ${linkedPlayer.parallelStats.ppg.toFixed(1)} puntos en su categoría principal. Es mucho más peligroso de lo que parece.`);
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
        insights.push(`🎓 VETERANÍA: ${veteran.nombre} aporta experiencia (${veteran.careerStats?.gamesPlayed} partidos y ${(veteran.careerStats?.totalMinutes || 0).toFixed(0)} minutos registrados).`);
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
            const rivalPlayerStats: PlayerAggregatedStats[] = rivalData.plantilla.map(p => {
                const pStats = rivalData.stats.filter(s => s && String(s.jugador_id) === String(p.jugador_id));
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
            }).filter(Boolean).sort((a, b) => b.ppg - a.ppg);
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
