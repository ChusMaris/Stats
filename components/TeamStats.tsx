
import React, { useState, useMemo } from 'react';
import { EstadisticaJugadorPartido, PlayerAggregatedStats, PartidoMovimiento, Plantilla } from '../types';
import { User, Calendar, Table, LayoutGrid, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import PlayerModal from './PlayerModal';

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

const TeamStats: React.FC<TeamStatsProps> = ({ equipoId, matches, plantilla, allPlantillas, stats, movements = [], esMini }) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
  const [playerViewMode, setPlayerViewMode] = useState<'table' | 'cards'>('table');
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

                  const teamMvp = (() => {
                    if (matchPlayerStats.length === 0) return null;
                    const sorted = [...matchPlayerStats].sort((a, b) => {
                      const valA = a.valoracion ?? 0;
                      const valB = b.valoracion ?? 0;
                      if (valB !== valA) return valB - valA;
                      return (b.puntos ?? 0) - (a.puntos ?? 0);
                    });
                    const mvpStat = sorted[0];
                    const playerMeta = getPlayerMeta(mvpStat.jugador_id);
                    const initials = playerMeta.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    return {
                      stat: mvpStat,
                      meta: playerMeta,
                      initials
                    };
                  })();

                  const matchComparison = (() => {
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

                    const localPts = match.local.score || localPlayersStats.reduce((sum, s) => sum + (s.puntos || 0), 0);
                    const visitorPts = match.visitor.score || visitorPlayersStats.reduce((sum, s) => sum + (s.puntos || 0), 0);

                    const localT1 = localPlayersStats.reduce((sum, s) => sum + (s.t1_anotados || 0), 0);
                    const visitorT1 = visitorPlayersStats.reduce((sum, s) => sum + (s.t1_anotados || 0), 0);

                    const localT2 = localPlayersStats.reduce((sum, s) => sum + (s.t2_anotados || 0), 0);
                    const visitorT2 = visitorPlayersStats.reduce((sum, s) => sum + (s.t2_anotados || 0), 0);

                    const localT3 = localPlayersStats.reduce((sum, s) => sum + (s.t3_anotados || 0), 0);
                    const visitorT3 = visitorPlayersStats.reduce((sum, s) => sum + (s.t3_anotados || 0), 0);

                    const localF = localPlayersStats.reduce((sum, s) => sum + (s.faltas_cometidas || 0) + (s.tecnicas || 0) + (s.antideportivas || 0), 0);
                    const visitorF = visitorPlayersStats.reduce((sum, s) => sum + (s.faltas_cometidas || 0) + (s.tecnicas || 0) + (s.antideportivas || 0), 0);

                    const totalPts = localPts + visitorPts;
                    const ptsPctLocal = totalPts > 0 ? (localPts / totalPts) * 100 : 50;

                    const totalT1 = localT1 + visitorT1;
                    const t1PctLocal = totalT1 > 0 ? (localT1 / totalT1) * 100 : 50;

                    const totalT2 = localT2 + visitorT2;
                    const t2PctLocal = totalT2 > 0 ? (localT2 / totalT2) * 100 : 50;

                    const totalT3 = localT3 + visitorT3;
                    const t3PctLocal = totalT3 > 0 ? (localT3 / totalT3) * 100 : 50;

                    const totalF = localF + visitorF;
                    const fPctLocal = totalF > 0 ? (localF / totalF) * 100 : 50;

                    return {
                      localPts,
                      visitorPts,
                      localT1,
                      visitorT1,
                      localT2,
                      visitorT2,
                      localT3,
                      visitorT3,
                      localF,
                      visitorF,
                      ptsPctLocal,
                      t1PctLocal,
                      t2PctLocal,
                      t3PctLocal,
                      fPctLocal
                    };
                  })();

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
                            <div className="flex items-center gap-xs">
                              <span className="text-[10px] font-black text-outline uppercase tracking-tighter">
                                Jornada {match.jornada || '-'}
                              </span>
                              <span className="w-0.5 h-0.5 bg-outline-variant rounded-full"></span>
                              <span className="text-[10px] font-semibold text-outline">
                                {formatDate(match.fecha_hora)}
                              </span>
                            </div>
                            <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter shrink-0 ${
                              match.puntos_local !== null && match.puntos_visitante !== null
                                ? 'bg-surface-container-high text-outline'
                                : 'bg-primary/10 text-primary'
                            }`}>
                              {match.puntos_local !== null && match.puntos_visitante !== null ? 'Finalizado' : 'Programado'}
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
                            <div className="flex items-center gap-2 px-2 py-0.5 bg-primary/5 rounded-lg shrink-0">
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
                        <div className="flex items-center shrink-0">
                          <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
                            keyboard_arrow_right
                          </span>
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
                        <div className="flex items-center gap-xs px-2 py-0.5 bg-primary rounded text-[10px] font-black text-on-primary uppercase tracking-tighter shrink-0">
                          {match.puntos_local !== null && match.puntos_visitante !== null ? 'Finalizado' : 'Programado'}
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
                        <div className="px-2 flex flex-col items-center shrink-0">
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
                        </div>

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
                                    <th className="py-2 px-2 font-semibold text-center w-12 bg-surface-container-low text-primary">VAL</th>
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
                                        <td className="py-3 px-2 text-center font-bold text-[14px] text-primary">
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
                                    <td className="py-3 px-2 text-center font-bold text-primary">{activeTeamStats.totalVal}</td>
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

                          {/* Bento Insights Grid adapted for Match Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Statistical Comparison */}
                            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col gap-3">
                              <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider">Líderes Estadísticos</h3>
                              <div className="flex flex-col gap-2">
                                {/* Puntos */}
                                <div className="flex justify-between items-center text-xs">
                                  <span className={`font-bold ${activeTeamType === 'local' ? 'text-primary' : 'text-outline'}`}>{matchComparison.localPts}</span>
                                  <span className="text-[10px] text-outline font-black tracking-wider uppercase">Puntos</span>
                                  <span className={`font-bold ${activeTeamType === 'visitor' ? 'text-primary' : 'text-outline'}`}>{matchComparison.visitorPts}</span>
                                </div>
                                <div className="relative h-2.5 w-full flex bg-surface-container rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${matchComparison.ptsPctLocal}%` }}></div>
                                  <div className="h-full bg-secondary" style={{ width: `${100 - matchComparison.ptsPctLocal}%` }}></div>
                                </div>

                                {/* T1 */}
                                <div className="flex justify-between items-center text-xs mt-1">
                                  <span className={`font-bold ${activeTeamType === 'local' ? 'text-primary' : 'text-outline'}`}>{matchComparison.localT1}</span>
                                  <span className="text-[10px] text-outline font-black tracking-wider uppercase">T1</span>
                                  <span className={`font-bold ${activeTeamType === 'visitor' ? 'text-primary' : 'text-outline'}`}>{matchComparison.visitorT1}</span>
                                </div>
                                <div className="relative h-2.5 w-full flex bg-surface-container rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${matchComparison.t1PctLocal}%` }}></div>
                                  <div className="h-full bg-secondary" style={{ width: `${100 - matchComparison.t1PctLocal}%` }}></div>
                                </div>

                                {/* T2 */}
                                <div className="flex justify-between items-center text-xs mt-1">
                                  <span className={`font-bold ${activeTeamType === 'local' ? 'text-primary' : 'text-outline'}`}>{matchComparison.localT2}</span>
                                  <span className="text-[10px] text-outline font-black tracking-wider uppercase">T2</span>
                                  <span className={`font-bold ${activeTeamType === 'visitor' ? 'text-primary' : 'text-outline'}`}>{matchComparison.visitorT2}</span>
                                </div>
                                <div className="relative h-2.5 w-full flex bg-surface-container rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${matchComparison.t2PctLocal}%` }}></div>
                                  <div className="h-full bg-secondary" style={{ width: `${100 - matchComparison.t2PctLocal}%` }}></div>
                                </div>

                                {/* T3 */}
                                <div className="flex justify-between items-center text-xs mt-1">
                                  <span className={`font-bold ${activeTeamType === 'local' ? 'text-primary' : 'text-outline'}`}>{matchComparison.localT3}</span>
                                  <span className="text-[10px] text-outline font-black tracking-wider uppercase">T3</span>
                                  <span className={`font-bold ${activeTeamType === 'visitor' ? 'text-primary' : 'text-outline'}`}>{matchComparison.visitorT3}</span>
                                </div>
                                <div className="relative h-2.5 w-full flex bg-surface-container rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${matchComparison.t3PctLocal}%` }}></div>
                                  <div className="h-full bg-secondary" style={{ width: `${100 - matchComparison.t3PctLocal}%` }}></div>
                                </div>

                                {/* Faltas */}
                                <div className="flex justify-between items-center text-xs mt-1">
                                  <span className={`font-bold ${activeTeamType === 'local' ? 'text-primary' : 'text-outline'}`}>{matchComparison.localF}</span>
                                  <span className="text-[10px] text-outline font-black tracking-wider uppercase">Faltas (F)</span>
                                  <span className={`font-bold ${activeTeamType === 'visitor' ? 'text-primary' : 'text-outline'}`}>{matchComparison.visitorF}</span>
                                </div>
                                <div className="relative h-2.5 w-full flex bg-surface-container rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${matchComparison.fPctLocal}%` }}></div>
                                  <div className="h-full bg-secondary" style={{ width: `${100 - matchComparison.fPctLocal}%` }}></div>
                                </div>
                              </div>
                            </div>

                            {/* MVP of the Match */}
                            {teamMvp ? (
                              <div className="bg-primary-container p-4 rounded-xl border border-outline-variant text-on-primary-container flex flex-col justify-between">
                                <div>
                                  <h3 className="text-[10px] font-bold text-on-primary-container/80 uppercase tracking-wider">MVP de {activeTeamData.name}</h3>
                                  <div className="flex items-center gap-3 mt-2">
                                    <div className="w-10 h-10 rounded-full border-2 border-on-primary-container overflow-hidden flex items-center justify-center bg-white shrink-0">
                                      <img 
                                        src={teamMvp.meta.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} 
                                        alt={teamMvp.meta.nombre} 
                                        className="w-full h-full object-cover rounded-full" 
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-sm text-on-primary-container truncate">{teamMvp.meta.nombre}</p>
                                      <p className="text-[10px] text-on-primary-container/80 font-medium">Dorsal #{teamMvp.meta.dorsal}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-y-3 gap-x-2 mt-3 border-t border-on-primary-container/20 pt-3 text-center sm:text-left">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide opacity-70">PTS</p>
                                    <p className="font-extrabold text-sm">{teamMvp.stat.puntos || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide opacity-70">MIN</p>
                                    <p className="font-extrabold text-sm">{formatTiempoPartido(teamMvp.stat.tiempo_jugado)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide opacity-70">T1</p>
                                    <p className="font-extrabold text-sm">{teamMvp.stat.t1_anotados || 0}/{teamMvp.stat.t1_intentados || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide opacity-70">T2</p>
                                    <p className="font-extrabold text-sm">{teamMvp.stat.t2_anotados || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide opacity-70">T3</p>
                                    <p className="font-extrabold text-sm">{teamMvp.stat.t3_anotados || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide opacity-70">F</p>
                                    <p className="font-extrabold text-sm">{(teamMvp.stat.faltas_cometidas || 0) + (teamMvp.stat.tecnicas || 0) + (teamMvp.stat.antideportivas || 0)}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-primary-container p-4 rounded-xl border border-outline-variant text-on-primary-container flex flex-col justify-center items-center italic text-xs">
                                Sin MVP disponible
                              </div>
                            )}

                            {/* Shooting Percentages */}
                            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col gap-3">
                              <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider">Porcentajes de tiro</h3>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-on-surface-variant">Tiro de 2</span>
                                  <div className="flex-1 mx-3 h-2 bg-surface-container rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, activeTeamStats.t2Pct)}%` }}></div>
                                  </div>
                                  <span className="text-xs font-bold text-primary">{Math.round(activeTeamStats.t2Pct)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-on-surface-variant">Triples</span>
                                  <div className="flex-1 mx-3 h-2 bg-surface-container rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, activeTeamStats.t3Pct)}%` }}></div>
                                  </div>
                                  <span className="text-xs font-bold text-primary">{Math.round(activeTeamStats.t3Pct)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-on-surface-variant">T. Libres</span>
                                  <div className="flex-1 mx-3 h-2 bg-surface-container rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, activeTeamStats.t1Pct)}%` }}></div>
                                  </div>
                                  <span className="text-xs font-bold text-primary">{Math.round(activeTeamStats.t1Pct)}%</span>
                                </div>
                              </div>
                            </div>
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
             <div className="relative flex items-center justify-end mb-2 md:mb-3 h-7">
              <div className="hidden md:flex absolute left-0 items-center gap-1.5 text-xs text-slate-400">
                <ArrowUpDown size={12} /> Orden: <span className="font-semibold text-fcbq-blue uppercase tracking-wide">{sortConfig.key}</span>
              </div>
              <div className="inline-flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                <button onClick={() => setPlayerViewMode('table')} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[14px] font-semibold uppercase tracking-[0.06em] transition-all ${playerViewMode === 'table' ? 'bg-white text-fcbq-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Table size={13} /> Tabla</button>
                <button onClick={() => setPlayerViewMode('cards')} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[14px] font-semibold uppercase tracking-[0.06em] transition-all ${playerViewMode === 'cards' ? 'bg-white text-fcbq-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={13} /> Tarjetas</button>
              </div>
             </div>
                          {playerViewMode === 'table' && (
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
                                  <span className="leading-none text-[12px] font-bold text-on-surface uppercase tracking-tight truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[200px] md:max-w-[320px]">
                                    {player.nombre}
                                  </span>
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
              )}

             {playerViewMode === 'cards' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                    {playerStats.map((player) => (
                    <div key={player.jugadorId} onClick={() => setSelectedPlayer(player)} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-300 cursor-pointer relative group flex flex-col items-center">
                        <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 font-bold text-sm px-2.5 py-1 rounded-lg">#{player.dorsal}</div>
                        <div className="w-28 h-28 rounded-full p-1 border border-slate-100 bg-white mb-3 shadow-sm relative group-hover:scale-105 transition-transform duration-300">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
                                <img src={player.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} className="w-full h-full object-cover" alt={player.nombre} />
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 text-base uppercase tracking-wide mb-6 truncate w-full text-center px-2">{player.nombre}</h3>
                        <div className="grid grid-cols-3 w-full border-t border-slate-50 pt-4">
                            <div className="flex flex-col items-center border-r border-slate-100">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">PTS</span>
                                <span className="text-xl font-black text-fcbq-blue leading-none">{player.totalPuntos}</span>
                            </div>
                            <div className="flex flex-col items-center border-r border-slate-100">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">PPG</span>
                                <span className="text-xl font-black text-slate-700 leading-none">{player.ppg.toFixed(1)}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">+/-</span>
                                <span className={`text-xl font-black leading-none ${(player.avgMasMenos || 0) > 0 ? 'text-green-600' : (player.avgMasMenos || 0) < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                    {(player.avgMasMenos || 0) > 0 ? '+' : ''}{(player.avgMasMenos || 0).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
             )}
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
