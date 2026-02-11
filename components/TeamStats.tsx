import React, { useState, useMemo } from 'react';
import { EstadisticaJugadorPartido, PlayerAggregatedStats, PartidoMovimiento, Plantilla } from '../types';
import { User, Calendar, Table, LayoutGrid, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import PlayerModal from './PlayerModal';

interface TeamStatsProps {
  equipoId: number | string;
  matches: any[];
  plantilla: Plantilla[];
  stats: EstadisticaJugadorPartido[];
  movements?: PartidoMovimiento[];
  esMini: boolean;
}

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
          <span className="absolute text-[11px] font-black text-slate-700">{Math.round(normalizedValue)}%</span>
      </div>
  );
};

const TeamStats: React.FC<TeamStatsProps> = ({ equipoId, matches, plantilla, stats, movements = [], esMini }) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
  const [playerViewMode, setPlayerViewMode] = useState<'table' | 'cards'>('table');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAggregatedStats | null>(null);
  
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

  const teamMatches = useMemo(() => {
    try {
      if (!matches || !Array.isArray(matches) || !plantilla) return [];
      const teamPlayerIds = new Set(plantilla.map(p => p && String(p.jugador_id)).filter(Boolean));

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
  }, [matches, stats, equipoId, plantilla]);

  const playerStats: PlayerAggregatedStats[] = useMemo(() => {
    try {
      if (!plantilla || !Array.isArray(plantilla)) return [];
      const processed = plantilla.map(p => {
          if (!p) return null;
          const pStats = (stats || []).filter(s => s && String(s.jugador_id) === String(p.jugador_id));
          const playerData = Array.isArray(p.jugadores) ? p.jugadores[0] : p.jugadores;
          const nombre = playerData?.nombre_completo || 'Jugador';
          const fotoUrl = playerData?.foto_url;
          const matchIds: string[] = Array.from(new Set(pStats.map(s => String(s.partido_id))));
          const gp = matchIds.length;
          const totalPts = pStats.reduce((sum, s) => sum + (s.puntos || 0), 0);
          const totalMins = pStats.reduce((sum, s) => sum + parseTiempoJugado(s.tiempo_jugado), 0);
          const mpg = gp > 0 ? totalMins / gp : 0;
          
          // Calculo PPM basado en minutos totales teóricos del partido (48 mini, 40 resto)
          const minutosPorPartido = esMini ? 48 : 40;
          const minutosTotalesPosibles = gp * minutosPorPartido;
          const ppm = minutosTotalesPosibles > 0 ? totalPts / minutosTotalesPosibles : 0;
          
          const totalFouls = pStats.reduce((sum, s) => sum + (s.faltas_cometidas || 0) + (s.tecnicas || 0) + (s.antideportivas || 0), 0);
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
              totalTirosLibresIntentados: t1I,
              totalTirosLibresAnotados: t1A,
              totalTiros2Intentados: t2I,
              totalTiros2Anotados: t2A,
              totalTiros3Intentados: t3I,
              totalTiros3Anotados: t3A,
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
  }, [plantilla, stats, sortConfig, esMini]);

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

  const TableHeader = ({ label, column, align = 'center' }: { label: string, column: keyof PlayerAggregatedStats | 't1Pct', align?: 'left' | 'center' }) => (
    <th className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group ${align === 'center' ? 'text-center' : 'text-left'}`} onClick={() => handleSort(column)}>
      <div className={`flex items-center ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span className={`${sortConfig.key === column ? 'text-fcbq-blue' : 'text-gray-400'} group-hover:text-gray-600`}>{label}</span>
        {sortConfig.key === column ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={12} className="opacity-20" />}
      </div>
    </th>
  );

  return (
    <div className="mt-8 animate-fade-in">
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab('matches')} className={`flex items-center gap-2 px-6 py-3 font-medium text-base transition-colors border-b-2 whitespace-nowrap ${activeTab === 'matches' ? 'border-fcbq-blue text-fcbq-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Calendar size={20} /> Partidos
        </button>
        <button onClick={() => setActiveTab('players')} className={`flex items-center gap-2 px-6 py-3 font-medium text-base transition-colors border-b-2 whitespace-nowrap ${activeTab === 'players' ? 'border-fcbq-blue text-fcbq-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <User size={20} /> Jugadores
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 min-h-[300px]">
        {activeTab === 'matches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {teamMatches.length === 0 && <p className="text-gray-500 col-span-full text-center py-10 italic text-lg">No hay registros de partidos.</p>}
            {teamMatches.map((match) => (
              <div key={match.id} className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-white flex flex-col group">
                {/* Cabecera unificada en 1/3 */}
                <div className="bg-slate-50/70 p-4 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                         <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Jornada {match.jornada}</span>
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(match.fecha_hora)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center w-1/3">
                            <div className={`w-12 h-12 p-1 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden ${match.local.isMyTeam ? 'ring-2 ring-fcbq-blue/30 border-fcbq-blue/20' : ''}`}>
                                {match.local.logo ? <img src={match.local.logo} alt="" className="w-full h-full object-contain rounded-full" /> : <span className="text-[9px] font-bold text-slate-300 uppercase">Logo</span>}
                            </div>
                            <span className={`text-[10px] mt-2 text-center font-black truncate w-full uppercase tracking-tighter ${match.local.isMyTeam ? 'text-fcbq-blue' : 'text-slate-500'}`}>{match.local.name}</span>
                        </div>
                        <div className="flex flex-col items-center w-1/3">
                            <div className="flex items-center gap-1.5 text-2xl font-black text-slate-800 tracking-tight leading-none">
                                <span>{match.local.score}</span>
                                <span className="text-slate-300 text-xl">-</span>
                                <span>{match.visitor.score}</span>
                            </div>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border mt-2 tracking-tighter ${match.resultStatus === 'W' ? 'bg-green-100 text-green-700 border-green-200' : match.resultStatus === 'L' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {match.resultStatus === 'W' ? 'VICTORIA' : (match.resultStatus === 'L' ? 'DERROTA' : 'EMPATE')}
                            </span>
                        </div>
                        <div className="flex flex-col items-center w-1/3">
                            <div className={`w-12 h-12 p-1 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden ${match.visitor.isMyTeam ? 'ring-2 ring-fcbq-blue/30 border-fcbq-blue/20' : ''}`}>
                                {match.visitor.logo ? <img src={match.visitor.logo} alt="" className="w-full h-full object-contain rounded-full" /> : <span className="text-[9px] font-bold text-slate-300 uppercase">Logo</span>}
                            </div>
                            <span className={`text-[10px] mt-2 text-center font-black truncate w-full uppercase tracking-tighter ${match.visitor.isMyTeam ? 'text-fcbq-blue' : 'text-slate-500'}`}>{match.visitor.name}</span>
                        </div>
                    </div>
                </div>

                {/* Cuerpo de Estadísticas alineadas */}
                <div className="p-5 flex-1 flex flex-col justify-center bg-white space-y-1">
                    <StatRow 
                        label="T2 Anotados" 
                        valLocal={match.local.stats.t2A} 
                        valVisit={match.visitor.stats.t2A} 
                    />
                    <StatRow 
                        label="T3 Anotados" 
                        valLocal={match.local.stats.t3A} 
                        valVisit={match.visitor.stats.t3A} 
                    />
                    <StatRow 
                        label="Faltas Cometidas" 
                        valLocal={match.local.stats.fouls} 
                        valVisit={match.visitor.stats.fouls} 
                        invert={true} 
                    />

                    {/* Fila Tiros Libres Alineada con los logos */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-3">
                        <div className="w-1/3 flex flex-col items-center gap-1.5">
                            <MiniDonut value={match.local.stats.t1Pct} />
                            <span className="text-[11px] font-black text-slate-600 tracking-wider">
                                {match.local.stats.t1A}/{match.local.stats.t1I}
                            </span>
                        </div>
                        
                        <div className="w-1/3 text-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">TIROS</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block mt-0.5">LIBRES %</span>
                        </div>

                        <div className="w-1/3 flex flex-col items-center gap-1.5">
                            <MiniDonut value={match.visitor.stats.t1Pct} />
                            <span className="text-[11px] font-black text-slate-600 tracking-wider">
                                {match.visitor.stats.t1A}/{match.visitor.stats.t1I}
                            </span>
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'players' && (
          <div className="animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                    <ArrowUpDown size={14} /> Ordenado por: <span className="font-bold text-fcbq-blue uppercase tracking-wider">{sortConfig.key}</span>
                </div>
                <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setPlayerViewMode('table')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold uppercase transition-all ${playerViewMode === 'table' ? 'bg-white text-fcbq-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Table size={16} /> Tabla</button>
                    <button onClick={() => setPlayerViewMode('cards')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold uppercase transition-all ${playerViewMode === 'cards' ? 'bg-white text-fcbq-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid size={16} /> Jugadores</button>
                </div>
             </div>

             {playerViewMode === 'table' && (
                <div className="overflow-x-auto animate-fade-in">
                    <table className="w-full text-base text-left">
                    <thead className="text-[10px] text-gray-400 font-bold uppercase border-b bg-transparent sticky top-0 bg-white z-10">
                        <tr>
                            <TableHeader label="#" column="dorsal" />
                            <TableHeader label="Jugador" column="nombre" align="left" />
                            <TableHeader label="PJ" column="partidosJugados" />
                            <TableHeader label="PPG" column="ppg" />
                            <TableHeader label="MPG" column="mpg" />
                            <TableHeader label="PPM" column="ppm" />
                            <TableHeader label="FPG" column="fpg" />
                            <TableHeader label="% T1" column="t1Pct" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {playerStats.map((player) => (
                            <tr key={player.jugadorId} className="hover:bg-blue-50/50 cursor-pointer transition group" onClick={() => setSelectedPlayer(player)}>
                                <td className="px-4 py-4 text-center text-gray-400 font-mono text-xl">{player.dorsal}</td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 shrink-0">
                                            <img src={player.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} className="w-full h-full object-cover" alt={player.nombre} />
                                        </div>
                                        <span className="font-semibold text-gray-700 uppercase tracking-tight group-hover:text-fcbq-blue transition-colors text-xs md:text-sm">{player.nombre}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center text-gray-600 font-medium">{player.partidosJugados}</td>
                                <td className="px-4 py-4 text-center"><span className="font-bold text-fcbq-blue text-lg">{player.ppg.toFixed(1)}</span></td>
                                <td className="px-4 py-4 text-center text-gray-500">{player.mpg.toFixed(1)}</td>
                                <td className="px-4 py-4 text-center text-gray-500">{player.ppm.toFixed(2)}</td>
                                <td className="px-4 py-4 text-center text-gray-500">{player.fpg.toFixed(1)}</td>
                                <td className="px-4 py-4 flex justify-center">
                                    <MiniDonut value={(player as any).t1Pct} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
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
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">MPG</span>
                                <span className="text-xl font-black text-slate-700 leading-none">{player.mpg.toFixed(1)}</span>
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