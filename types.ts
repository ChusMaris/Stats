
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

export interface PlayerAggregatedStats {
  jugadorId: number | string;
  nombre: string;
  dorsal: string;
  fotoUrl?: string;
  partidosJugados: number;
  totalPuntos: number;
  totalMinutos: number;
  totalFaltas: number;
  totalTirosLibresIntentados: number;
  totalTirosLibresAnotados: number;
  totalTiros2Intentados: number;
  totalTiros2Anotados: number;
  totalTiros3Intentados: number;
  totalTiros3Anotados: number;
  // Averages
  ppg: number;
  mpg: number;
  fpg: number;
  ppm: number;
}