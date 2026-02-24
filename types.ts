
export interface Temporada {
  id: number | string;
  nombre: string;
}

export interface Categoria {
  id: number | string;
  nombre: string;
  es_mini: boolean;
}

export interface Competicion {
  id: number | string;
  nombre: string;
  temporada_id: number | string;
  categoria_id: number | string;
  categorias?: Categoria; // Joined
}

export interface Club {
  id: number | string;
  nombre: string;
  logo_url?: string;
  nombre_corto?: string;
}

export interface Equipo {
  id: number | string;
  club_id: number | string;
  team_id_intern_fce?: number;
  nombre_especifico: string;
  competicion_id: number | string;
  clubs?: Club;
}

export interface Partido {
  id: number | string;
  id_match_extern?: number;
  id_match_intern?: number;
  equipo_local_id: number | string;
  equipo_visitante_id: number | string;
  fecha_hora?: string;
  periodos_totales?: number;
  duracion_periodo?: number;
  competicion_id: number | string;
  puntos_local?: number;
  puntos_visitante?: number;
  jornada?: number;
  equipos_local?: Equipo;     // Virtual join for easier access
  equipos_visitante?: Equipo; // Virtual join for easier access
  equipo_local?: Equipo;      // Aliased join used in dataService
  equipo_visitante?: Equipo;  // Aliased join used in dataService
  es_calendario?: boolean;    // Flag to indicate source
}

export interface CalendarioItem {
  id: number | string;
  competicion_id: number | string;
  jornada: number;
  equipo_local_id: number | string;
  equipo_visitante_id: number | string;
  fecha_hora: string;
  created_at?: string;
  // Joins
  equipo_local?: Equipo;
  equipo_visitante?: Equipo;
}

export interface Jugador {
  id: number | string;
  nombre_completo: string;
  foto_url?: string;
  actor_id?: number;
}

export interface Plantilla {
  equipo_id: number | string;
  jugador_id: number | string;
  dorsal?: number;
  jugadores?: Jugador;
}

export interface EstadisticaJugadorPartido {
  id: number | string;
  partido_id: number | string;
  jugador_id: number | string;
  puntos: number;
  valoracion?: number;
  mas_menos?: number; // Added Plus-Minus field
  asistencias?: number;
  robos?: number;
  tapones_favor?: number;
  tapones_contra?: number;
  perdidas?: number;
  rebotes_totales?: number;
  rebotes_defensivos?: number;
  rebotes_ofensivos?: number;
  t1_intentados?: number;
  t1_anotados?: number;
  t1_fallados?: number;
  t2_intentados?: number;
  t2_anotados?: number;
  t2_fallados?: number;
  t3_intentados?: number;
  t3_anotados?: number;
  t3_fallados?: number;
  faltas_cometidas?: number;
  faltas_recibidas?: number;
  faltas_ataque?: number;
  tecnicas?: number;
  antideportivas?: number;
  descalificantes?: number;
  mates?: number;
  contraataques?: number;
  minuto?: number; // Sometimes stored as minutes played
  minutos?: number; // Potential alias
  min?: number; // Potential alias
  tiempo_jugado?: string | number; // New field from DB
}

export interface PartidoMovimiento {
  id: number | string;
  partido_id: number | string;
  jugador_id: number | string;
  tipo_movimiento?: string; 
  descripcion?: string; // Correct field name from DB
  minuto?: string | number; // 'MM:SS' or number
  segundo?: number;
  periodo?: number;
}

// Custom Types for App Logic
export interface TeamStanding {
  equipoId: number | string;
  nombre: string;
  clubLogo?: string;
  pj: number;
  pg: number;
  pp: number;
  pf: number; // Puntos Favor
  pc: number; // Puntos Contra
  diff: number;
  puntos: number; // Classification points
}

export interface CareerStats {
  gamesPlayed: number;
  ppg: number;
  totalPoints: number;
  avgT3Made: number; // Volume of 3 pointers made per game
  t1Pct: number;
  bestScoringGame: number;
  totalMinutes: number; // Added: Total historical minutes
  mpg: number; // Added: Historical Minutes Per Game
}

// NEW: Stats from other competitions in the same season (for linked players)
export interface ParallelStats {
    gamesPlayed: number;
    ppg: number;
    competitionNames: string[]; // e.g., ["Junior A", "Copa"]
    isPrimaryContext: boolean; // True if they play MORE games elsewhere than here
}

export interface PlayerAggregatedStats {
  jugadorId: number | string;
  nombre: string;
  dorsal: string;
  fotoUrl?: string;
  partidosJugados: number;
  totalPuntos: number;
  totalMinutos: number;
  totalFaltas: number;
  totalFaltasTiro: number;
  totalTirosLibresIntentados: number;
  totalTirosLibresAnotados: number;
  totalTiros2Intentados: number;
  totalTiros2Anotados: number;
  totalTiros3Intentados: number;
  totalTiros3Anotados: number;
  totalMasMenos?: number; // Accumulated +/-
  // Averages
  ppg: number;
  mpg: number;
  fpg: number;
  ppm: number;
  avgMasMenos?: number; // Average +/- per game
  // Analysis
  t1Pct?: number; // Only Free Throws have percentage
  // Removed t3Pct, tsPct, eFgPct as requested (no attempt data for T2/T3)
  last3PPG?: number; // Recent form (PPG of last N games played)
  lastGamesPlayed?: number; // How many games are included in the last3PPG calc (1, 2, or 3)
  pointsShare?: number; // % of team points
  
  // NEW: Historical Data
  careerStats?: CareerStats;
  // NEW: Parallel Season Data (Other Categories)
  parallelStats?: ParallelStats;
}

// Scouting Report Types
export interface ScoutingReport {
  teamStats: {
    ppg: number; // Puntos por partido
    papg: number; // Puntos recibidos por partido (Points Against)
    t3PerGame: number; // Triples anotados por partido
    ftPct: number; // % Tiros Libres equipo
    last5Form: string[]; // ['W', 'L', 'W'...]
  };
  keyPlayers: {
    topScorer: PlayerAggregatedStats | null;
    topShooter: PlayerAggregatedStats | null; // Mejor triplista (Volumen)
    topRebounder: PlayerAggregatedStats | null; // (Si tuviéramos rebotes fiables)
    foulMagnet: PlayerAggregatedStats | null; // Recibe muchas faltas
    badFreeThrowShooter: PlayerAggregatedStats | null; // < 50% FT
  };
  rosterStats: PlayerAggregatedStats[]; // Lista completa para análisis manual
  insights: string[]; // Frases generadas automáticamente
  matchAnalysis?: {
    prediction: string;
    keyMatchup: string;
    tempoAnalysis: string;
  };
}

// LocalStorage Helper Type
export interface RecentCompetition {
  id: string;
  nombre: string;
  temporadaId: string;
  categoriaId: string;
  temporadaNombre: string;
  categoriaNombre: string;
  fase?: string; // Phase name for restoring filters
  timestamp: number;
}
