
import React, { useState, useMemo } from 'react';
import { EstadisticaJugadorPartido, PlayerAggregatedStats, PartidoMovimiento, Plantilla } from '../types';
import { User, Calendar, ArrowUpDown, ChevronUp, ChevronDown, Info, Activity } from 'lucide-react';
import PlayerModal from './PlayerModal';
import { hasYoutubeLink } from '../utils/matchVideoLink';
import { aggregateMatchScoring, type MatchScoringSummary } from '../utils/matchScoringSummary';
import { buildMatchScoreProgression, type MatchScoreProgression } from '../utils/matchScoreProgression';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TeamStatsProps {
  equipoId: number | string;
  matches: any[];
  plantilla: Plantilla[];
  allPlantillas?: Plantilla[];
  stats: EstadisticaJugadorPartido[];
  movements?: PartidoMovimiento[];
  esMini: boolean;
}

const SHOOTING_FOUL_IDS = ['160', '161', '162', '165', '166', '537', '540', '544', '549'];

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Pendiente';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Pendiente';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return 'Pendiente';
  }
};

const getInitialsCompact = (name: string): string => {
  if (!name) return '';
  const clean = name.replace(/[^A-Z0-9\s]/gi, '').trim();
  const words = clean.split(/\s+/).filter(w => {
    const u = w.toUpperCase();
    return u !== 'C' && u !== 'CB' && u !== 'CE' && u !== 'A' && u !== 'B' && u !== 'CLUB' && u !== 'BASKET' && u !== 'BÀSQUET';
  });
  if (words.length >= 2) {
    return (words[0].substring(0, 1) + words[1].substring(0, 1)).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getPctColor = (pct: number) => {
  if (pct < 40) return '#ef4444'; // Rojo
  if (pct < 65) return '#f59e0b'; // Naranja/Ámbar
  return '#22c55e'; // Verde
};

const MiniDonut = ({ value }: { value: number }) => {
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (normalizedValue / 100) * circumference;
  const color = getPctColor(normalizedValue);
  
  return (
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
              <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
              <circle 
                cx={size / 2} 
                cy={size / 2} 
                r={radius} 
                stroke={color} 
                strokeWidth={strokeWidth} 
                fill="transparent" 
                strokeDasharray={circumference} 
                strokeDashoffset={offset} 
                strokeLinecap="round" 
                className="transition-all duration-1000 ease-out"
              />
          </svg>
          <span className="absolute text-[14px] font-black text-slate-700">{Math.round(normalizedValue)}%</span>
      </div>
  );
};

const MatchVideoButton = ({ link }: { link?: string | null }) => {
  const href = typeof link === 'string' ? link.trim() : '';
  if (!hasYoutubeLink(href)) return null;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ver partido en YouTube"
      title="Ver partido en YouTube"
      onClick={handleClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#ff0000] shadow-sm transition-all hover:opacity-90 shrink-0"
    >
      <span className="ml-[2px] h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white" aria-hidden="true" />
    </a>
  );
};

const formatMatchSummaryPercentage = (value: number | null): string =>
  value === null ? '—' : `${Math.round(value)}%`;

const MatchScoreProgressionChart: React.FC<{
  progression: MatchScoreProgression;
  localName: string;
  visitorName: string;
}> = ({ progression, localName, visitorName }) => {
  const localColor = '#064a73';
  const visitorColor = '#24b8b0';
  const periodTicks = progression.periodScores.map(period => period.period - 0.5);

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-outline-variant bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-outline-variant/70 px-3 py-3">
        <h3 className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Activity size={15} aria-hidden="true" />
          </span>
          Evolución del marcador
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-medium text-on-surface-variant">
          <span className="flex max-w-[120px] items-center gap-1.5 truncate" title={localName}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: localColor }} />
            {getInitialsCompact(localName)}
          </span>
          <span className="flex max-w-[120px] items-center gap-1.5 truncate" title={visitorName}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: visitorColor }} />
            {getInitialsCompact(visitorName)}
          </span>
        </div>
      </div>

      {!progression.hasEvents ? (
        <div className="px-4 py-12 text-center text-xs text-outline">
          Sin datos de evolución del marcador para este partido.
        </div>
      ) : (
        <>
          <div className="h-56 px-2 pt-3 sm:h-64 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progression.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, progression.periodCount]}
                  ticks={periodTicks}
                  tickFormatter={(value: number) => `P${Math.floor(value) + 1}`}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  padding={{ left: 4, right: 4 }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  width={30}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <Tooltip
                  labelFormatter={(value) => `Periodo ${Math.min(progression.periodCount, Math.floor(Number(value)) + 1)}`}
                  formatter={(value, name) => [value, name === 'local' ? localName : visitorName]}
                  contentStyle={{ borderRadius: 8, borderColor: '#cbd5e1', fontSize: 11 }}
                />
                {progression.periodScores.slice(0, -1).map(period => (
                  <ReferenceLine key={period.period} x={period.period} stroke="#cbd5e1" />
                ))}
                <Line
                  type="linear"
                  dataKey="local"
                  name="local"
                  stroke={localColor}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: localColor, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="visitor"
                  name="visitor"
                  stroke={visitorColor}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: visitorColor, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 px-3 pb-3 sm:grid-cols-4">
            {progression.periodScores.map(period => {
              const localLeads = period.local > period.visitor;
              const visitorLeads = period.visitor > period.local;
              const leader = localLeads ? localName : visitorLeads ? visitorName : null;

              return (
                <div key={period.period} className="flex min-w-0 items-center justify-between gap-2 rounded border border-outline-variant bg-surface-container-low/50 px-3 py-2.5">
                  <span className="text-[10px] font-bold text-outline">P{period.period}</span>
                  <span className="whitespace-nowrap text-sm font-black tabular-nums text-primary">
                    {period.local}<span className="mx-1 font-medium text-outline">-</span>{period.visitor}
                  </span>
                  {leader ? (
                    <span className={`max-w-12 truncate text-[9px] font-bold ${localLeads ? 'text-primary' : 'text-teal-600'}`} title={leader}>
                      {getInitialsCompact(leader)}
                    </span>
                  ) : <span className="w-5" />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

const MatchScoringSummaryPanel: React.FC<{
  localName: string;
  visitorName: string;
  local: MatchScoringSummary;
  visitor: MatchScoringSummary;
  progression: MatchScoreProgression;
}> = ({ localName, visitorName, local, visitor, progression }) => {
  const [showLegend, setShowLegend] = useState(false);

  const renderTeam = (name: string, scoring: MatchScoringSummary, isLocal: boolean) => {
    const colors = isLocal
      ? ['#064a73', '#5c91ad', '#b7d4e0']
      : ['#108f91', '#4dbbb5', '#b7e3df'];
    const shotPoints = scoring.t2.points + scoring.t3.points + scoring.t1.points;
    const t2End = shotPoints > 0 ? (scoring.t2.points / shotPoints) * 100 : 0;
    const t3End = shotPoints > 0 ? t2End + (scoring.t3.points / shotPoints) * 100 : 0;
    const donutBackground = shotPoints > 0
      ? `conic-gradient(${colors[0]} 0 ${t2End}%, ${colors[1]} ${t2End}% ${t3End}%, ${colors[2]} ${t3End}% 100%)`
      : 'conic-gradient(#e2e8f0 0 100%)';
    const rows = [
      { label: 'Tiro de 2', shots: scoring.t2 },
      { label: 'Tiro de 3', shots: scoring.t3 },
      { label: 'Tiro libre', shots: scoring.t1 },
      { label: 'Tiros de campo', shots: scoring.fieldGoals },
      { label: 'Total', shots: scoring.total }
    ];

    return (
      <div className="min-w-0 p-3 sm:p-4">
        <h3 className="mb-3 truncate text-[10px] font-bold uppercase tracking-wide text-on-surface">{name}</h3>
        <div className="mx-auto grid w-fit max-w-full grid-cols-[68px_auto] items-center gap-3">
          <div
            role="img"
            aria-label={`${scoring.points} puntos; ${scoring.t2.points} de dos, ${scoring.t3.points} de tres y ${scoring.t1.points} de tiros libres`}
            className="relative aspect-square w-[68px] rounded-full"
            style={{ background: donutBackground }}
          >
            <div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full bg-white text-center">
              <span className="text-base font-black leading-none text-on-surface">{scoring.points}</span>
              <span className="mt-1 text-[8px] font-semibold uppercase text-outline">puntos</span>
            </div>
          </div>
          <div className="grid gap-1 text-[10px]">
            {[
              { label: 'Tiro de 2', points: scoring.t2.points, color: colors[0] },
              { label: 'Tiro de 3', points: scoring.t3.points, color: colors[1] },
              { label: 'Tiro libre', points: scoring.t1.points, color: colors[2] }
            ].map((item) => (
              <div key={item.label} className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 flex-1 truncate text-on-surface-variant">{item.label}</span>
                <span className="shrink-0 font-bold text-on-surface">{item.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden border-t border-outline-variant/50 pt-2">
          <div className="grid grid-cols-[minmax(3rem,1fr)_2rem_2.8rem_3.3rem_2.7rem_2rem] gap-x-1.5 px-1 pb-1 text-[8px] font-extrabold uppercase text-on-surface sm:grid-cols-[minmax(5rem,1fr)_2.5rem_3.5rem_4.25rem_3.5rem_3rem] sm:gap-x-3 sm:text-[9px]">
            <span>Tipo</span><span className="whitespace-nowrap text-right">Pts</span><span className="whitespace-nowrap text-right">Dist. pts</span><span className="whitespace-nowrap text-right">Dist. tiros</span><span className="whitespace-nowrap text-right">C/I</span><span className="whitespace-nowrap text-right">% A</span>
          </div>
          {rows.map((row, index) => {
            const pointsShare = scoring.points > 0
              ? `${Math.round((row.shots.points / scoring.points) * 100)}%`
              : '—';
            const shotShare = scoring.total.attempted > 0
              ? `${Math.round((row.shots.attempted / scoring.total.attempted) * 100)}%`
              : '—';

            return (
              <div
                key={row.label}
                className={`grid grid-cols-[minmax(3rem,1fr)_2rem_2.8rem_3.3rem_2.7rem_2rem] gap-x-1.5 px-1 py-2 text-[9px] sm:grid-cols-[minmax(5rem,1fr)_2.5rem_3.5rem_4.25rem_3.5rem_3rem] sm:gap-x-3 sm:text-[10px] ${index === rows.length - 1 ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}
              >
                <span className="truncate">{row.label}</span>
                <span className="text-right tabular-nums">{row.shots.points}</span>
                <span className="text-right tabular-nums">{pointsShare}</span>
                <span className="text-right tabular-nums">{shotShare}</span>
                <span className="text-right tabular-nums">{row.shots.made}/{row.shots.attempted}</span>
                <span className="text-right tabular-nums">{formatMatchSummaryPercentage(row.shots.percentage)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
    <section className="mb-4 overflow-hidden rounded-xl border border-outline-variant bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/50 px-3 py-2">
        <h2 className="text-[10px] font-bold text-on-surface-variant">
          Distribución y eficiencia de anotación
        </h2>
        <button
          type="button"
          onClick={() => setShowLegend(current => !current)}
          aria-label={showLegend ? 'Ocultar leyenda de estadísticas' : 'Mostrar leyenda de estadísticas'}
          aria-expanded={showLegend}
          title={showLegend ? 'Ocultar leyenda' : 'Mostrar leyenda'}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Info size={15} aria-hidden="true" />
        </button>
      </div>
      {showLegend && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-outline-variant/50 bg-surface-container-low/40 px-3 py-3 text-[10px] sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
            <span className="font-bold uppercase text-on-surface-variant">Dist. pts</span>
            <span className="text-outline">Distribución del total de puntos anotados</span>
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
            <span className="font-bold uppercase text-on-surface-variant">Dist. tiros</span>
            <span className="text-outline">Distribución de los tiros efectuados</span>
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
            <span className="font-bold uppercase text-on-surface-variant">C/I</span>
            <span className="text-outline">Convertidos / intentados</span>
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
            <span className="font-bold uppercase text-on-surface-variant">% acierto</span>
            <span className="text-outline">Porcentaje de conversión (C/I × 100)</span>
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 sm:col-span-2">
            <span className="font-bold uppercase text-on-surface-variant">Tiros de campo</span>
            <span className="text-outline">Suma de T2 + T3; no incluye tiros libres</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 divide-y divide-outline-variant/50 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        {renderTeam(localName, local, true)}
        {renderTeam(visitorName, visitor, false)}
      </div>
    </section>
    <MatchScoreProgressionChart progression={progression} localName={localName} visitorName={visitorName} />
    </>
  );
};

const TeamStats: React.FC<TeamStatsProps> = ({ equipoId, matches, plantilla, allPlantillas, stats, movements = [], esMini }) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
  const [matchViewMode, setMatchViewMode] = useState<'table' | 'cards'>('table');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAggregatedStats | null>(null);
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Set<string>>(new Set());
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(new Set());
  const [activeMatchTeam, setActiveMatchTeam] = useState<Record<string, 'local' | 'visitor'>>({});
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof PlayerAggregatedStats | 't1Pct'; direction: 'asc' | 'desc' }>({
    key: 'totalPuntos',
    direction: 'desc'
  });

  const handleSort = (key: keyof PlayerAggregatedStats | 't1Pct') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

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

  const formatTiempoPartido = (tiempo: string | number | undefined): string => {
    if (tiempo === undefined || tiempo === null || tiempo === '') return '0:00';
    if (typeof tiempo === 'string') return tiempo;
    const totalSeconds = Math.max(0, Math.round(tiempo * 60));
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  const formatPartidoLabel = (partidoId: number | string): string => {
    const match = (matches || []).find(m => m && String(m.id) === String(partidoId));
    if (!match) return `Partido ${partidoId}`;
    const rival = String(match.equipo_local_id) === String(equipoId)
      ? (match.equipo_visitante?.nombre_especifico || 'Rival')
      : (match.equipo_local?.nombre_especifico || 'Rival');
    return `J${match.jornada || '-'} · ${rival}`;
  };

  const getMatchById = (partidoId: number | string) => {
    return (matches || []).find(m => m && String(m.id) === String(partidoId));
  };

  const togglePlayerExpansion = (playerId: number | string) => {
    const key = String(playerId);
    setExpandedPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleMatchExpansion = (matchId: number | string) => {
    const key = String(matchId);
    setExpandedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const teamPlayerIds = useMemo(() => {
    return new Set((plantilla || []).map(p => p && String(p.jugador_id)).filter(Boolean));
  }, [plantilla]);

  const getPlayerMeta = (jugadorId: number | string) => {
    const rosterList = allPlantillas || plantilla || [];
    const rosterItem = rosterList.find(p => p && String(p.jugador_id) === String(jugadorId));
    const playerData = Array.isArray(rosterItem?.jugadores) ? rosterItem?.jugadores[0] : rosterItem?.jugadores;

    return {
      dorsal: rosterItem?.dorsal?.toString() || '-',
      nombre: playerData?.nombre_completo || 'Jugador',
      fotoUrl: playerData?.foto_url || null
    };
  };

  const teamMatches = useMemo(() => {
    try {
      if (!matches || !Array.isArray(matches) || !plantilla) return [];
      return matches
        .filter(m => m && (String(m.equipo_local_id) === String(equipoId) || String(m.equipo_visitante_id) === String(equipoId)))
        .map(m => {
          const isLocalMyTeam = String(m.equipo_local_id) === String(equipoId);
          const matchStats = (stats || []).filter(s => s && String(s.partido_id) === String(m.id)); 
          
          const processTeamStats = (isLocal: boolean) => {
            const teamStats = matchStats.filter(s => {
                const isPlayerFromMyTeam = teamPlayerIds.has(String(s.jugador_id));
                return isLocal === isLocalMyTeam ? isPlayerFromMyTeam : !isPlayerFromMyTeam;
            });

            const t1A = teamStats.reduce((sum, s) => sum + (s.t1_anotados || 0), 0);
            const t1I = teamStats.reduce((sum, s) => sum + (s.t1_intentados || 0), 0);
            return {
              t1A,
              t1I,
              t1Pct: t1I > 0 ? (t1A / t1I) * 100 : 0,
              t2A: teamStats.reduce((sum, s) => sum + (s.t2_anotados || 0), 0),
              t3A: teamStats.reduce((sum, s) => sum + (s.t3_anotados || 0), 0),
              fouls: teamStats.reduce((sum, s) => sum + (s.faltas_cometidas || 0) + (s.tecnicas || 0) + (s.antideportivas || 0), 0)
            };
          };

          const localProcessed = processTeamStats(true);
          const visitProcessed = processTeamStats(false);

          const myScore = isLocalMyTeam ? (m.puntos_local ?? 0) : (m.puntos_visitante ?? 0);
          const oppScore = isLocalMyTeam ? (m.puntos_visitante ?? 0) : (m.puntos_local ?? 0);
          const isWin = myScore > oppScore;
          const isDraw = myScore === oppScore;

          return {
            ...m,
            local: {
                name: m.equipo_local?.nombre_especifico || 'Local',
                logo: m.equipo_local?.clubs?.logo_url,
                score: m.puntos_local ?? 0,
                isMyTeam: isLocalMyTeam,
                stats: localProcessed
            },
            visitor: {
                name: m.equipo_visitante?.nombre_especifico || 'Visitante',
                logo: m.equipo_visitante?.clubs?.logo_url,
                score: m.puntos_visitante ?? 0,
                isMyTeam: !isLocalMyTeam,
                stats: visitProcessed
            },
            resultStatus: isWin ? 'W' : (isDraw ? 'D' : 'L')
          };
        });
    } catch (e) {
      console.error("Error processing team matches", e);
      return [];
    }
  }, [matches, stats, equipoId, teamPlayerIds]);

  const playerStats: PlayerAggregatedStats[] = useMemo(() => {
    try {
      if (!plantilla || !Array.isArray(plantilla)) return [];
      const processed = plantilla.map(p => {
          if (!p) return null;
          const pStats = (stats || []).filter(s => s && String(s.jugador_id) === String(p.jugador_id));
          const pMovements = (movements || []).filter(m => m && String(m.jugador_id) === String(p.jugador_id));

          const playerData = Array.isArray(p.jugadores) ? p.jugadores[0] : p.jugadores;
          const nombre = playerData?.nombre_completo || 'Jugador';
          const fotoUrl = playerData?.foto_url;
          const matchIds: string[] = Array.from(new Set(pStats.map(s => String(s.partido_id))));
          const gp = matchIds.length;
          const totalPts = pStats.reduce((sum, s) => sum + (s.puntos || 0), 0);
          const totalMins = pStats.reduce((sum, s) => sum + parseTiempoJugado(s.tiempo_jugado), 0);
          const mpg = gp > 0 ? totalMins / gp : 0;
          
          // Calculo PPM Original (Puntos por Minuto Teórico de Partido)
          // 48 min para Mini, 40 min para el resto
          const gameDuration = esMini ? 48 : 40;
          const ppm = gp > 0 ? (totalPts / gp) / gameDuration : 0;
          
          const totalFouls = pStats.reduce((sum, s) => sum + (s.faltas_cometidas || 0) + (s.tecnicas || 0) + (s.antideportivas || 0), 0);
          
          // Calculo Faltas de Tiro
          const totalFaltasTiro = pMovements.filter(m => SHOOTING_FOUL_IDS.includes(String(m.tipo_movimiento))).length;

          // Aggregation Plus Minus
          const totalMasMenos = pStats.reduce((sum, s) => sum + (s.mas_menos || 0), 0);

          const t1A = pStats.reduce((sum, s) => sum + (s.t1_anotados || 0), 0);
          const t1I = pStats.reduce((sum, s) => sum + (s.t1_intentados || 0), 0);
          const t2A = pStats.reduce((sum, s) => sum + (s.t2_anotados || 0), 0);
          const t2I = pStats.reduce((sum, s) => sum + (s.t2_intentados || 0), 0);
          const t3A = pStats.reduce((sum, s) => sum + (s.t3_anotados || 0), 0);
          const t3I = pStats.reduce((sum, s) => sum + (s.t3_intentados || 0), 0);

          return {
              jugadorId: p.jugador_id,
              nombre,
              dorsal: p.dorsal?.toString() || '-',
              fotoUrl,
              partidosJugados: gp,
              totalPuntos: totalPts,
              totalMinutos: totalMins,
              totalFaltas: totalFouls,
              totalFaltasTiro: totalFaltasTiro,
              totalTirosLibresIntentados: t1I,
              totalTirosLibresAnotados: t1A,
              totalTiros2Intentados: t2I,
              totalTiros2Anotados: t2A,
              totalTiros3Intentados: t3I,
              totalTiros3Anotados: t3A,
              totalMasMenos: totalMasMenos, // ADDED
              avgMasMenos: gp > 0 ? totalMasMenos / gp : 0, // ADDED
              ppg: gp > 0 ? totalPts / gp : 0,
              mpg: mpg,
              fpg: gp > 0 ? totalFouls / gp : 0,
              ppm: ppm,
              t1Pct: t1I > 0 ? (t1A / t1I) * 100 : 0
          } as PlayerAggregatedStats & { t1Pct: number };
      }).filter((p): p is (PlayerAggregatedStats & { t1Pct: number }) => p !== null);

      return [...processed].sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];
        if (sortConfig.key === 'dorsal') {
          aValue = parseInt(a.dorsal) || 0;
          bValue = parseInt(b.dorsal) || 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } catch (e) {
      return [];
    }
  }, [plantilla, stats, movements, sortConfig, esMini]);

  const getStatColor = (val1: number, val2: number, invert: boolean = false) => {
    if (val1 === val2) return 'text-slate-600';
    if (invert) return val1 < val2 ? 'text-green-600 font-bold' : 'text-slate-400';
    return val1 > val2 ? 'text-green-600 font-bold' : 'text-slate-400';
  };

  const StatRow = ({ label, valLocal, valVisit, invert = false }: { label: string, valLocal: number, valVisit: number, invert?: boolean }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
        <div className={`w-1/3 text-center text-sm ${getStatColor(valLocal, valVisit, invert)}`}>
            {valLocal}
        </div>
        <div className="w-1/3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            {label}
        </div>
        <div className={`w-1/3 text-center text-sm ${getStatColor(valVisit, valLocal, invert)}`}>
            {valVisit}
        </div>
    </div>
  );

  const TableHeader = ({ label, column, align = 'center', className = '' }: { label: string, column: keyof PlayerAggregatedStats | 't1Pct', align?: 'left' | 'center', className?: string }) => (
    <th className={`cursor-pointer hover:bg-surface-container-low transition-colors group ${align === 'center' ? 'text-center' : 'text-left'} ${className}`} onClick={() => handleSort(column)}>
      <div className={`flex items-center ${align === 'center' ? 'justify-center' : 'justify-start'} gap-1`}>
        <span className={`${sortConfig.key === column ? 'text-primary font-bold' : 'text-on-surface-variant'} group-hover:text-primary transition-colors`}>{label}</span>
        {sortConfig.key === column ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} className="shrink-0 text-primary" /> : <ChevronDown size={12} className="shrink-0 text-primary" />) : <ArrowUpDown size={10} className="opacity-30 shrink-0 group-hover:opacity-65 transition-opacity" />}
      </div>
    </th>
  );

  return (
    <div className="mt-4 animate-fade-in space-y-4">
      {/* Refined Tab Navigation */}
      <div className="flex border-b border-outline-variant bg-surface-container-lowest rounded-t-xl overflow-hidden shadow-sm">
        <button 
          onClick={() => setActiveTab('matches')} 
          className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all text-center border-b-2 ${
            activeTab === 'matches' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-outline hover:bg-surface-container-low/60 hover:text-on-surface'
          }`}
        >
          Partidos
        </button>
        <button 
          onClick={() => setActiveTab('players')} 
          className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all text-center border-b-2 ${
            activeTab === 'players' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-outline hover:bg-surface-container-low/60 hover:text-on-surface'
          }`}
        >
          Jugadores
        </button>
      </div>

      <div className="min-h-[300px]">
        {activeTab === 'matches' && (
          <div className="animate-fade-in space-y-sm">
            {teamMatches.length === 0 ? (
              <div className="p-8 text-center text-outline bg-surface-container-lowest border border-dashed border-outline-variant rounded-2xl text-sm italic">
                No hay registros de partidos para este equipo.
              </div>
            ) : (
              <div className="space-y-3">
                {teamMatches.map((match) => {
                  const isExpanded = expandedMatchIds.has(String(match.id));
                  const myTeamStats = match.local.isMyTeam ? match.local.stats : match.visitor.stats;

                  // Active team type in expanded match card
                  const activeTeamType = activeMatchTeam[match.id] || 'local';
                  const activeTeamData = activeTeamType === 'local' ? match.local : match.visitor;

                  // Players stats for the active team in this match
                  const matchPlayerStats = (stats || [])
                    .filter(s => {
                      if (!s || String(s.partido_id) !== String(match.id)) return false;
                      
                      // If we have allPlantillas, we can look up which team the player belongs to
                      if (allPlantillas && allPlantillas.length > 0) {
                        const pRecord = allPlantillas.find(p => p && String(p.jugador_id) === String(s.jugador_id));
                        if (pRecord) {
                          const playerTeamId = String(pRecord.equipo_id);
                          const targetTeamId = activeTeamType === 'local' ? String(match.equipo_local_id) : String(match.equipo_visitante_id);
                          return playerTeamId === targetTeamId;
                        }
                      }
                      
                      // Fallback: use teamPlayerIds to distinguish selected team from opponent
                      const isPlayerFromMyTeam = teamPlayerIds.has(String(s.jugador_id));
                      const isTargetMyTeam = activeTeamType === 'local' ? match.local.isMyTeam : match.visitor.isMyTeam;
                      return isPlayerFromMyTeam === isTargetMyTeam;
                    })
                    .sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

                  const activeTeamStats = (() => {
                    const t1A = matchPlayerStats.reduce((sum, s) => sum + (s.t1_anotados || 0), 0);
                    const t1I = matchPlayerStats.reduce((sum, s) => sum + (s.t1_intentados || 0), 0);
                    
                    const t2A = matchPlayerStats.reduce((sum, s) => sum + (s.t2_anotados || 0), 0);
                    const t2I = matchPlayerStats.reduce((sum, s) => sum + (s.t2_intentados || 0), 0);
                    
                    const t3A = matchPlayerStats.reduce((sum, s) => sum + (s.t3_anotados || 0), 0);
                    const t3I = matchPlayerStats.reduce((sum, s) => sum + (s.t3_intentados || 0), 0);
                    
                    const totalPts = matchPlayerStats.reduce((sum, s) => sum + (s.puntos || 0), 0);
                    const totalReb = matchPlayerStats.reduce((sum, s) => sum + (s.rebotes_totales || 0), 0);
                    const totalAst = matchPlayerStats.reduce((sum, s) => sum + (s.asistencias || 0), 0);
                    const totalRob = matchPlayerStats.reduce((sum, s) => sum + (s.robos || 0), 0);
                    const totalTap = matchPlayerStats.reduce((sum, s) => sum + (s.tapones_favor || 0), 0);
                    const totalFlt = matchPlayerStats.reduce((sum, s) => sum + (s.faltas_cometidas || 0) + (s.tecnicas || 0) + (s.antideportivas || 0), 0);
                    const totalVal = matchPlayerStats.reduce((sum, s) => sum + (s.valoracion || 0), 0);

                    return {
                      t1A,
                      t1I,
                      t1Pct: t1I > 0 ? (t1A / t1I) * 100 : 0,
                      t2A,
                      t2I,
                      t2Pct: t2I > 0 ? (t2A / t2I) * 100 : 0,
                      t3A,
                      t3I,
                      t3Pct: t3I > 0 ? (t3A / t3I) * 100 : 0,
                      totalPts,
                      totalReb,
                      totalAst,
                      totalRob,
                      totalTap,
                      totalFlt,
                      totalVal
                    };
                  })();

                  const localPlayersStats = (stats || []).filter(s => {
                    if (!s || String(s.partido_id) !== String(match.id)) return false;
                    const pRecord = (allPlantillas || []).find(p => p && String(p.jugador_id) === String(s.jugador_id));
                    if (pRecord) {
                      return String(pRecord.equipo_id) === String(match.equipo_local_id);
                    }
                    return teamPlayerIds.has(String(s.jugador_id)) === match.local.isMyTeam;
                  });

                  const visitorPlayersStats = (stats || []).filter(s => {
                    if (!s || String(s.partido_id) !== String(match.id)) return false;
                    const pRecord = (allPlantillas || []).find(p => p && String(p.jugador_id) === String(s.jugador_id));
                    if (pRecord) {
                      return String(pRecord.equipo_id) === String(match.equipo_visitante_id);
                    }
                    return teamPlayerIds.has(String(s.jugador_id)) === match.visitor.isMyTeam;
                  });

                  const localScoring = aggregateMatchScoring(localPlayersStats, match.local.score);
                  const visitorScoring = aggregateMatchScoring(visitorPlayersStats, match.visitor.score);
                  const scoreProgression = isExpanded
                    ? buildMatchScoreProgression(movements || [], match.id, esMini, match.periodos_totales || 4)
                    : null;
                  const isLocalMyTeam = match.local.isMyTeam;
                  const myScore = isLocalMyTeam ? match.local.score : match.visitor.score;
                  const oppScore = isLocalMyTeam ? match.visitor.score : match.local.score;
                  const isWin = myScore > oppScore;
                  const isDraw = myScore === oppScore;

                  if (!isExpanded) {
                    // --- COLLAPSED MATCH CARD ---
                    return (
                      <div 
                        key={match.id}
                        onClick={() => toggleMatchExpansion(match.id)}
                        className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex items-center justify-between hover:border-primary/40 hover:bg-surface-container-low transition-all cursor-pointer group active:scale-[0.99]"
                      >
                        <div className="flex flex-col gap-1 w-full min-w-0 flex-1 pr-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-xs min-w-0">
                              <span className="text-[10px] font-black text-outline uppercase tracking-tighter">
                                Jornada {match.jornada || '-'}
                              </span>
                              <span className="w-0.5 h-0.5 bg-outline-variant rounded-full"></span>
                              <span className="text-[10px] font-semibold text-outline">
                                {formatDate(match.fecha_hora)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter ${
                                match.puntos_local !== null && match.puntos_visitante !== null
                                  ? 'bg-surface-container-high text-outline'
                                  : 'bg-primary/10 text-primary'
                              }`}>
                                {match.puntos_local !== null && match.puntos_visitante !== null ? 'Finalizado' : 'Programado'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-sm">
                            {/* Local Team */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {match.local.logo ? (
                                <img src={match.local.logo} alt="" className="w-6 h-6 object-contain rounded shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                  match.local.isMyTeam ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant/30'
                                }`}>
                                  <span className={`material-symbols-outlined text-sm ${
                                    match.local.isMyTeam ? 'text-on-primary' : 'text-outline'
                                  }`}>
                                    {match.local.isMyTeam ? 'sports_basketball' : 'shield'}
                                  </span>
                                </div>
                              )}
                              <span className={`text-[14px] font-bold truncate ${
                                match.local.isMyTeam ? 'text-primary' : 'text-outline'
                              }`}>
                                {match.local.name}
                              </span>
                            </div>

                            {/* Score Pill */}
                            <div className="flex items-center gap-2 px-2 py-0.5 bg-primary/5 rounded-lg min-w-[78px] justify-center shrink-0">
                              <span className={`text-[13px] font-black ${
                                match.local.score !== null && match.visitor.score !== null && match.local.score > match.visitor.score
                                  ? 'text-emerald-600 font-extrabold'
                                  : match.local.isMyTeam ? 'text-on-surface' : 'text-outline'
                              }`}>
                                {match.local.score !== null ? match.local.score : '-'}
                              </span>
                              <span className="text-[10px] font-bold text-outline">-</span>
                              <span className={`text-[13px] font-black ${
                                match.local.score !== null && match.visitor.score !== null && match.visitor.score > match.local.score
                                  ? 'text-emerald-600 font-extrabold'
                                  : match.visitor.isMyTeam ? 'text-on-surface' : 'text-outline'
                              }`}>
                                {match.visitor.score !== null ? match.visitor.score : '-'}
                              </span>
                            </div>

                            {/* Visitor Team */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                              <span className={`text-[14px] font-bold truncate text-right ${
                                match.visitor.isMyTeam ? 'text-primary' : 'text-outline'
                              }`}>
                                {match.visitor.name}
                              </span>
                              {match.visitor.logo ? (
                                <img src={match.visitor.logo} alt="" className="w-6 h-6 object-contain rounded shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                  match.visitor.isMyTeam ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant/30'
                                }`}>
                                  <span className={`material-symbols-outlined text-sm ${
                                    match.visitor.isMyTeam ? 'text-on-primary' : 'text-outline'
                                  }`}>
                                    {match.visitor.isMyTeam ? 'sports_basketball' : 'shield'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center shrink-0 pl-2">
                          <MatchVideoButton link={match.youtube_link} />
                        </div>
                      </div>
                    );
                  }

                  // --- EXPANDED MATCH CARD ---
                  return (
                    <div 
                      key={match.id}
                      className="bg-surface-container-lowest rounded-2xl overflow-hidden transition-all duration-300 border border-outline-variant hover:border-primary/40 hover:bg-surface-container-low shadow-sm"
                    >
                      {/* Card Header */}
                      <div 
                        onClick={() => toggleMatchExpansion(match.id)}
                        className="px-4 py-3 bg-surface-container-low flex justify-between items-center border-b border-outline-variant/30 cursor-pointer active:bg-surface-container-high/60"
                      >
                        <div className="flex items-center gap-sm">
                          <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                            Jornada {match.jornada || '-'}
                          </span>
                          <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
                          <span className="text-[10px] font-semibold text-on-surface-variant">
                            {formatDate(match.fecha_hora)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-xs px-2 py-0.5 bg-primary rounded text-[10px] font-black text-on-primary uppercase tracking-tighter">
                            {match.puntos_local !== null && match.puntos_visitante !== null ? 'Finalizado' : 'Programado'}
                          </div>
                        </div>
                      </div>

                      {/* Match Scoreboard */}
                      <div className="p-4 flex items-center justify-between gap-xs">
                        {/* Local Team */}
                        <div className="flex-1 flex flex-col items-center min-w-0">
                          {match.local.logo ? (
                            <div className={`w-12 h-12 rounded-2xl bg-white border flex items-center justify-center mb-xs shadow-md shrink-0 ${
                              isLocalMyTeam ? 'border-primary ring-2 ring-primary/10' : 'border-outline-variant/50'
                            }`}>
                              <img src={match.local.logo} alt="" className="w-full h-full object-contain p-1 rounded-2xl" referrerPolicy="no-referrer" />
                            </div>
                          ) : isLocalMyTeam ? (
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-xs shadow-lg shadow-primary/20 ring-2 ring-primary/10 shrink-0">
                              <span className="material-symbols-outlined text-on-primary text-2xl">sports_basketball</span>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-outline-variant/50 flex items-center justify-center mb-xs shadow-inner shrink-0">
                              <span className="material-symbols-outlined text-outline text-2xl">shield</span>
                            </div>
                          )}
                          <span className={`text-[10px] font-black text-center leading-tight uppercase px-1 truncate w-full ${
                            isLocalMyTeam ? 'text-primary' : 'text-on-surface-variant'
                          }`}>
                            {match.local.name}
                          </span>
                        </div>

                        {/* Scores & Outcome */}
                        <div className="px-2 flex items-center justify-center gap-2 shrink-0">
                          <div className="flex items-center gap-sm">
                            <span className={`text-3xl font-black ${
                              match.local.score !== null && match.visitor.score !== null && match.local.score > match.visitor.score
                                ? 'text-emerald-600 font-extrabold'
                                : isLocalMyTeam ? 'text-primary' : 'text-on-surface'
                            }`}>
                              {match.local.score}
                            </span>
                            <span className="text-primary-container font-bold text-xl">-</span>
                            <span className={`text-3xl font-black ${
                              match.local.score !== null && match.visitor.score !== null && match.visitor.score > match.local.score
                                ? 'text-emerald-600 font-extrabold'
                                : !isLocalMyTeam ? 'text-primary' : 'text-on-surface'
                            }`}>
                              {match.visitor.score}
                            </span>
                          </div>
                        </div>
                        {match.puntos_local !== null && match.puntos_visitante !== null && (
                          <div className={`mt-2 px-2.5 py-0.5 rounded-full ${
                            isWin ? 'bg-primary/10' : isDraw ? 'bg-outline/10' : 'bg-red-50'
                          }`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              isWin ? 'text-primary' : isDraw ? 'text-outline' : 'text-red-600'
                            }`}>
                              {isWin ? 'Victoria' : isDraw ? 'Empate' : 'Derrota'}
                            </span>
                          </div>
                        )}

                        {/* Visitor Team */}
                        <div className="flex-1 flex flex-col items-center min-w-0">
                          {match.visitor.logo ? (
                            <div className={`w-12 h-12 rounded-2xl bg-white border flex items-center justify-center mb-xs shadow-md shrink-0 ${
                              !isLocalMyTeam ? 'border-primary ring-2 ring-primary/10' : 'border-outline-variant/50'
                            }`}>
                              <img src={match.visitor.logo} alt="" className="w-full h-full object-contain p-1 rounded-2xl" referrerPolicy="no-referrer" />
                            </div>
                          ) : !isLocalMyTeam ? (
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-xs shadow-lg shadow-primary/20 ring-2 ring-primary/10 shrink-0">
                              <span className="material-symbols-outlined text-on-primary text-2xl">sports_basketball</span>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-outline-variant/50 flex items-center justify-center mb-xs shadow-inner shrink-0">
                              <span className="material-symbols-outlined text-outline text-2xl">shield</span>
                            </div>
                          )}
                          <span className={`text-[10px] font-black text-center leading-tight uppercase px-1 truncate w-full ${
                            !isLocalMyTeam ? 'text-primary' : 'text-on-surface-variant'
                          }`}>
                            {match.visitor.name}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Interaction Label / Accordion Trigger */}
                      <div 
                        onClick={() => toggleMatchExpansion(match.id)}
                        className="w-full border-t border-outline-variant/20 py-3 flex items-center justify-center gap-xs bg-surface-container-low/50 hover:bg-primary-fixed/10 transition-colors cursor-pointer group/nav"
                      >
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                          {isExpanded ? 'Contraer Ficha' : 'Ver Ficha del Partido'}
                        </span>
                        <span className={`material-symbols-outlined text-primary text-md transition-transform ${
                          isExpanded ? 'rotate-180' : 'group-hover/nav:translate-x-1'
                        }`}>
                          {isExpanded ? 'expand_less' : 'keyboard_arrow_right'}
                        </span>
                      </div>

                      {/* Professional Stats Table (Expanded) */}
                      {isExpanded && (
                        <div className="border-t border-outline-variant/20 bg-surface-container-lowest animate-fade-in p-2 sm:p-4 overflow-hidden">
                          <MatchScoringSummaryPanel
                            localName={match.local.name}
                            visitorName={match.visitor.name}
                            local={localScoring}
                            visitor={visitorScoring}
                            progression={scoreProgression!}
                          />

                          {/* Tabs for Local vs Visitor inside expanded match details */}
                          <div className="flex border-b border-outline-variant mb-4 bg-surface-container-low/40 rounded-lg p-1 gap-1">
                            <button 
                              onClick={() => setActiveMatchTeam(prev => ({ ...prev, [match.id]: 'local' }))}
                              className={`w-1/2 min-w-0 py-2.5 text-xs font-bold transition-all text-center rounded-lg ${
                                activeTeamType === 'local'
                                  ? 'bg-primary text-white shadow-md scale-[1.01]'
                                  : 'text-slate-500 hover:bg-surface-container-low/60 hover:text-slate-800'
                              }`}
                            >
                              <span className="block uppercase tracking-wider truncate px-2">{match.local.name}</span>
                              <span className={`block text-[10px] font-medium mt-0.5 normal-case ${
                                activeTeamType === 'local' ? 'text-white/85' : 'text-slate-400'
                              }`}>
                                (Local)
                              </span>
                            </button>
                            <button 
                              onClick={() => setActiveMatchTeam(prev => ({ ...prev, [match.id]: 'visitor' }))}
                              className={`w-1/2 min-w-0 py-2.5 text-xs font-bold transition-all text-center rounded-lg ${
                                activeTeamType === 'visitor'
                                  ? 'bg-primary text-white shadow-md scale-[1.01]'
                                  : 'text-slate-500 hover:bg-surface-container-low/60 hover:text-slate-800'
                              }`}
                            >
                              <span className="block uppercase tracking-wider truncate px-2">{match.visitor.name}</span>
                              <span className={`block text-[10px] font-medium mt-0.5 normal-case ${
                                activeTeamType === 'visitor' ? 'text-white/85' : 'text-slate-400'
                              }`}>
                                (Visitante)
                              </span>
                            </button>
                          </div>

                          {/* Estadísticas de Jugadores (Moved above bento grid as requested) */}
                          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
                            <div className="bg-surface-container-low px-sm py-2.5 border-b border-outline-variant/30 flex justify-between items-center">
                              <h2 className="text-[10px] font-bold text-outline uppercase tracking-wider">Estadísticas de {activeTeamData.name}</h2>
                              <span className="text-[10px] font-medium text-outline">
                                {matchPlayerStats.length} convocados
                              </span>
                            </div>

                            {matchPlayerStats.length === 0 ? (
                              <div className="p-4 text-center text-outline text-xs italic">
                                Sin estadísticas individuales para {activeTeamData.name} en este partido.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                              <table className="w-full text-left text-data-tabular border-collapse min-w-[700px] lg:min-w-full">
                                <thead>
                                  <tr className="text-on-surface-variant opacity-70 bg-surface-container-low border-b border-outline-variant uppercase text-[10px]">
                                    <th className="py-2 px-4 font-semibold text-center w-12 bg-surface-container-low">#</th>
                                    <th className="py-2 px-4 font-semibold text-left w-[100px] sm:w-[160px] bg-surface-container-low">Jugador</th>
                                    <th className="py-2 px-2 font-semibold text-center w-14 bg-surface-container-low">MIN</th>
                                    <th className="py-2 px-2 font-semibold text-center w-12 bg-surface-container-low">PTS</th>
                                    <th className="hidden py-2 px-2 font-semibold text-center w-12 bg-surface-container-low text-primary">VAL</th>
                                    <th className="py-2 px-2 font-semibold text-center w-12 bg-surface-container-low">+/-</th>
                                    <th className="py-2 px-2 font-semibold text-center w-14 bg-surface-container-low">T1</th>
                                    <th className="py-2 px-2 font-semibold text-center w-12 bg-surface-container-low">T2</th>
                                    <th className="py-2 px-2 font-semibold text-center w-12 bg-surface-container-low">T3</th>
                                    <th className="py-2 px-4 font-semibold text-center w-10 bg-surface-container-low">F</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant">
                                  {matchPlayerStats.map((item) => {
                                    const playerMeta = getPlayerMeta(item.jugador_id);
                                    const fouls = (item.faltas_cometidas || 0) + (item.tecnicas || 0) + (item.antideportivas || 0);

                                    return (
                                      <tr key={`${match.id}-${item.jugador_id}`} className="hover:bg-surface-container-low transition-colors text-[14px] font-medium">
                                        <td className="py-3 px-4 font-bold text-center text-[14px] text-outline">
                                          {playerMeta.dorsal}
                                        </td>
                                        <td className="py-3 px-4 font-bold">
                                          <div className="flex items-center gap-xs">
                                            <div className="w-6 h-6 rounded-full border border-outline-variant/10 overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center">
                                              <img 
                                                src={playerMeta.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} 
                                                className="w-full h-full object-cover" 
                                                alt={playerMeta.nombre} 
                                                referrerPolicy="no-referrer"
                                              />
                                            </div>
                                            <span className="leading-none text-[14px] font-bold text-on-surface uppercase tracking-tight truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[200px] md:max-w-[320px]">
                                              {playerMeta.nombre}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-2 text-center text-[14px] text-slate-600 font-medium">
                                          {formatTiempoPartido(item.tiempo_jugado)}
                                        </td>
                                        <td className="py-3 px-2 text-center font-bold text-[14px] text-primary">
                                          {item.puntos || 0}
                                        </td>
                                        <td className="hidden py-3 px-2 text-center font-bold text-[14px] text-primary">
                                          {item.valoracion || 0}
                                        </td>
                                        <td className={`py-3 px-2 text-center font-bold text-[14px] ${
                                          (item.mas_menos || 0) > 0 
                                            ? 'text-green-600' 
                                            : (item.mas_menos || 0) < 0 
                                              ? 'text-red-500' 
                                              : 'text-slate-600'
                                        }`}>
                                          {(item.mas_menos || 0) > 0 ? '+' : ''}{item.mas_menos || 0}
                                        </td>
                                        <td className="py-3 px-2 text-center text-slate-600 text-[14px] font-medium">
                                          {item.t1_anotados || 0}/{item.t1_intentados || 0}
                                        </td>
                                        <td className="py-3 px-2 text-center text-slate-600 text-[14px] font-medium">
                                          {item.t2_anotados || 0}
                                        </td>
                                        <td className="py-3 px-2 text-center text-slate-600 text-[14px] font-medium">
                                          {item.t3_anotados || 0}
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-600 text-[14px] font-medium">
                                          {fouls}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="border-t border-outline-variant bg-surface-container-low/50">
                                  <tr className="font-bold text-[14px]">
                                    <td className="py-3 px-4"></td>
                                    <td className="py-3 px-4 text-slate-800 uppercase">TOTALES</td>
                                    <td className="py-3 px-2 text-center text-slate-600 opacity-65">-</td>
                                    <td className="py-3 px-2 text-center font-bold text-primary">{activeTeamStats.totalPts}</td>
                                    <td className="hidden py-3 px-2 text-center font-bold text-primary">{activeTeamStats.totalVal}</td>
                                    <td className="py-3 px-2 text-center text-slate-600 opacity-65">-</td>
                                    <td className="py-3 px-2 text-center text-slate-600">{activeTeamStats.t1A}/{activeTeamStats.t1I}</td>
                                    <td className="py-3 px-2 text-center text-slate-600">{activeTeamStats.t2A}</td>
                                    <td className="py-3 px-2 text-center text-slate-600">{activeTeamStats.t3A}</td>
                                    <td className="py-3 px-4 text-center text-slate-600">{activeTeamStats.totalFlt}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div className="animate-fade-in">
             <div className="hidden md:flex mb-2 md:mb-3 items-center gap-1.5 text-xs text-slate-400">
                <ArrowUpDown size={12} /> Orden: <span className="font-semibold text-fcbq-blue uppercase tracking-wide">{sortConfig.key}</span>
              </div>
               <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest animate-fade-in shadow-sm">
                 <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left text-data-tabular border-collapse min-w-[850px]">
                    <thead>
                      <tr className="text-on-surface-variant opacity-70 bg-surface-container-low border-b border-outline-variant uppercase text-[10px]">
                        <TableHeader label="#" column="dorsal" className="w-[48px] py-2 px-3 font-semibold text-center" />
                        <TableHeader label="Jugador" column="nombre" align="left" className="w-[110px] sm:w-[240px] py-2 px-3 font-semibold" />
                        <TableHeader label="PJ" column="partidosJugados" className="w-12 py-2 px-1 font-semibold text-center" />
                        <TableHeader label="PPG" column="ppg" className="w-12 py-2 px-1 font-semibold text-center" />
                        <TableHeader label="MPG" column="mpg" className="w-12 py-2 px-1 font-semibold text-center" />
                        <TableHeader label="PPM" column="ppm" className="w-12 py-2 px-1 font-semibold text-center" />
                        <TableHeader label="FPG" column="fpg" className="w-12 py-2 px-1 font-semibold text-center" />
                        <TableHeader label="+/-" column="avgMasMenos" className="w-12 py-2 px-1 font-semibold text-center" />
                        <TableHeader label="% T1" column="t1Pct" className="w-14 py-2 px-3 font-semibold text-center" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {playerStats.map((player) => {
                        const isExpanded = expandedPlayerIds.has(String(player.jugadorId));
                        const playerMatchStats = (stats || [])
                          .filter(s => s && String(s.jugador_id) === String(player.jugadorId))
                          .sort((a, b) => {
                            const matchA = getMatchById(a.partido_id);
                            const matchB = getMatchById(b.partido_id);
                            const jornadaA = Number(matchA?.jornada ?? -1);
                            const jornadaB = Number(matchB?.jornada ?? -1);
                            return jornadaB - jornadaA;
                          });

                        return (
                          <React.Fragment key={player.jugadorId}>
                          <tr className={`hover:bg-surface-container-low transition-colors cursor-pointer border-l-4 ${isExpanded ? 'bg-surface-container-low/30 border-primary' : 'hover:bg-surface-container-low border-transparent'}`} onClick={() => togglePlayerExpansion(player.jugadorId)}>
                            <td className="py-2.5 px-3 font-bold text-center text-outline text-[14px]">
                              {player.dorsal}
                            </td>
                            <td className="py-2.5 px-3 font-bold">
                              <div className="flex items-center gap-xs">
                                <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center">
                                  <img 
                                    src={player.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} 
                                    alt={player.nombre} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="min-w-0 flex flex-col">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedPlayer(player);
                                    }}
                                    aria-label={`Ver ficha de ${player.nombre}`}
                                    className="max-w-[85px] truncate text-left text-[12px] font-bold uppercase leading-none tracking-tight text-on-surface hover:text-primary xs:max-w-[120px] sm:max-w-[200px] md:max-w-[320px]"
                                  >
                                    {player.nombre}
                                  </button>
                                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1 leading-none">
                                    {isExpanded ? 'Ocultar partidos' : 'Ver partidos'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-1 text-center text-[12px] text-slate-600 font-medium">{player.partidosJugados}</td>
                            <td className="py-2.5 px-1 text-center text-[13px] font-extrabold text-primary">{player.ppg.toFixed(1)}</td>
                            <td className="py-2.5 px-1 text-center text-[12px] text-slate-600 font-medium">{player.mpg.toFixed(1)}</td>
                            <td className="py-2.5 px-1 text-center text-[12px] text-slate-600 font-medium">{player.ppm.toFixed(2)}</td>
                            <td className="py-2.5 px-1 text-center text-[12px] text-slate-600 font-medium">{player.fpg.toFixed(1)}</td>
                            <td className={`py-2.5 px-1 text-center text-[12px] font-bold ${
                              (player.avgMasMenos || 0) > 0 
                                ? 'text-green-600 font-extrabold' 
                                : (player.avgMasMenos || 0) < 0 
                                  ? 'text-red-600 font-extrabold' 
                                  : 'text-slate-600'
                            }`}>
                              {(player.avgMasMenos || 0) > 0 ? '+' : ''}{(player.avgMasMenos || 0).toFixed(1)}
                            </td>
                            <td className="py-1 px-3 text-center">
                              <div className="flex justify-center">
                                <MiniDonut value={(player as any).t1Pct} />
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-surface-container-low/10 animate-fade-in border-b border-outline-variant/30">
                              <td className="py-3 px-4" colSpan={9}>
                                <div className="border border-outline-variant rounded-xl bg-white overflow-hidden shadow-sm">
                                  <div className="px-3 py-2 bg-surface-container-low/50 border-b border-outline-variant text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Desglose por partido
                                  </div>

                                  {playerMatchStats.length === 0 ? (
                                  <div className="px-4 py-5 text-sm text-slate-400 italic">Sin datos por partido.</div>
                                  ) : (
                                  <div className="overflow-x-auto hide-scrollbar">
                                    <table className="w-full text-[14px] border-collapse">
                                      <thead>
                                        <tr className="bg-surface-container-low/40 text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant font-bold">
                                          <th className="px-3 py-2 text-left">Partido</th>
                                          <th className="px-3 py-2 text-left">Resultado</th>
                                          <th className="px-3 py-2 text-center">PTS</th>
                                          <th className="px-3 py-2 text-center">MIN</th>
                                          <th className="px-3 py-2 text-center">+/-</th>
                                          <th className="px-3 py-2 text-center">T1</th>
                                          <th className="px-3 py-2 text-center">T2</th>
                                          <th className="px-3 py-2 text-center">T3</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-outline-variant/30">
                                        {playerMatchStats.map((item) => (
                                          <tr key={`${player.jugadorId}-${item.partido_id}`} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{formatPartidoLabel(item.partido_id)}</td>
                                            <td className="px-3 py-2">
                                              {(() => {
                                                const match = getMatchById(item.partido_id);
                                                const localLogo = match?.equipo_local?.clubs?.logo_url;
                                                const visitorLogo = match?.equipo_visitante?.clubs?.logo_url;
                                                const localName = match?.equipo_local?.nombre_especifico || 'Local';
                                                const visitorName = match?.equipo_visitante?.nombre_especifico || 'Visitante';
                                                const hasScore = match?.puntos_local !== null && match?.puntos_local !== undefined && match?.puntos_visitante !== null && match?.puntos_visitante !== undefined;

                                                return (
                                                  <div className="min-w-[85px] md:min-w-[140px] max-w-full">
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-white border border-outline-variant shrink-0">
                                                        {localLogo ? (
                                                          <img src={localLogo} alt={localName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                        ) : (
                                                          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400">L</div>
                                                        )}
                                                      </div>
                                                      {hasScore ? (
                                                        <div
                                                          aria-label={`Resultado: ${match?.puntos_local}-${match?.puntos_visitante}`}
                                                          className="inline-flex items-center justify-center min-w-[54px] gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold border bg-surface-container-lowest border-outline-variant shadow-sm"
                                                        >
                                                          <span className={match?.puntos_local! > match?.puntos_visitante! ? 'text-emerald-600 font-extrabold' : 'text-slate-500 font-bold'}>
                                                            {match?.puntos_local}
                                                          </span>
                                                          <span className="text-slate-300 font-medium">-</span>
                                                          <span className={match?.puntos_visitante! > match?.puntos_local! ? 'text-emerald-600 font-extrabold' : 'text-slate-500 font-bold'}>
                                                            {match?.puntos_visitante}
                                                          </span>
                                                        </div>
                                                      ) : (
                                                        <span
                                                          className="inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded-md text-[10px] font-extrabold border bg-surface-container-lowest text-slate-400 border-outline-variant"
                                                        >
                                                          VS
                                                        </span>
                                                      )}
                                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-white border border-outline-variant shrink-0">
                                                        {visitorLogo ? (
                                                          <img src={visitorLogo} alt={visitorName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                        ) : (
                                                          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400">V</div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })()}
                                            </td>
                                            <td className="px-3 py-2 text-center font-bold text-primary">{item.puntos || 0}</td>
                                            <td className="px-3 py-2 text-center text-slate-600">{formatTiempoPartido(item.tiempo_jugado)}</td>
                                            <td className={`px-3 py-2 text-center font-bold ${(item.mas_menos || 0) > 0 ? 'text-green-600 font-extrabold' : (item.mas_menos || 0) < 0 ? 'text-red-500 font-extrabold' : 'text-slate-400'}`}>
                                              {(item.mas_menos || 0) > 0 ? '+' : ''}{item.mas_menos || 0}
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-600">{item.t1_anotados || 0}/{item.t1_intentados || 0}</td>
                                            <td className="px-3 py-2 text-center text-slate-600">{item.t2_anotados || 0}</td>
                                            <td className="px-3 py-2 text-center text-slate-600">{item.t3_anotados || 0}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    </table>
                 </div>
                </div>
          </div>
        )}
      </div>

      {selectedPlayer && (
        <PlayerModal 
            player={selectedPlayer} 
            equipoId={equipoId}
            matches={matches}
            matchStats={(stats || []).filter(s => s && String(s.jugador_id) === String(selectedPlayer.jugadorId))}
            movements={movements}
            esMini={esMini}
            onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </div>
  );
};

export default TeamStats;
