import React, { useState, useMemo } from 'react';
import { EstadisticaJugadorPartido, PlayerAggregatedStats, PartidoMovimiento, Plantilla } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { User, Calendar, Table, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import PlayerModal from './PlayerModal';

interface TeamStatsProps {
  equipoId: number | string;
  matches: any[];
  plantilla: Plantilla[];
  stats: EstadisticaJugadorPartido[];
  movements?: PartidoMovimiento[];
  esMini: boolean;
}

const MiniDonut = ({ value }: { value: number }) => {
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Ensure value is between 0 and 100
  const normalizedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (normalizedValue / 100) * circumference;
  
  let color = '#e5e7eb'; // gray-200 default for 0 or empty
  if (value > 0 || (value === 0 && normalizedValue === 0)) { // Logic check: if 0% but attempted, it's red? Let's stick to standard thresholds
     if (normalizedValue === 0) color = '#d1d5db'; // gray-300
     else if (normalizedValue < 50) color = '#ef4444'; // red-500
     else if (normalizedValue < 70) color = '#f59e0b'; // amber-500
     else color = '#10b981'; // emerald-500
  }
  
  return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
              <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#f3f4f6"
                  strokeWidth={strokeWidth}
                  fill="transparent"
              />
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
              />
          </svg>
          <span className="absolute text-[11px] font-bold text-gray-600">{Math.round(normalizedValue)}%</span>
      </div>
  );
};

const TeamStats: React.FC<TeamStatsProps> = ({ equipoId, matches, plantilla, stats, movements = [], esMini }) => {
  // Estado principal: Partidos o Jugadores
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
  // Estado secundario: Vista dentro de Jugadores (Tabla o Tarjetas/Jugadores)
  const [playerViewMode, setPlayerViewMode] = useState<'table' | 'cards'>('table');
  
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAggregatedStats | null>(null);

  // Helper para normalizar el tiempo jugado (puede venir como 'MM:SS' string o número)
  const parseTiempoJugado = (tiempo: string | number | undefined): number => {
    if (!tiempo) return 0;
    
    // Si ya es un número (minutos)
    if (typeof tiempo === 'number') return tiempo;

    // Si es string "MM:SS" o "MM"
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

  // Procesamiento de partidos
  const teamMatches = useMemo(() => {
    try {
      if (!matches || !Array.isArray(matches) || !plantilla) return [];
      const teamPlayerIds = new Set(plantilla.map(p => p && String(p.jugador_id)).filter(Boolean));

      return matches
        .filter(m => m && (String(m.equipo_local_id) === String(equipoId) || String(m.equipo_visitante_id) === String(equipoId)))
        .map(m => {
          const isLocal = String(m.equipo_local_id) === String(equipoId);
          const matchStats = (stats || []).filter(s => s && String(s.partido_id) === String(m.id)); 
          const teamStatsInMatch = matchStats.filter(s => teamPlayerIds.has(String(s.jugador_id)));
          
          const t1A = teamStatsInMatch.reduce((sum, s) => sum + (s.t1_anotados || 0), 0);
          const t1I = teamStatsInMatch.reduce((sum, s) => sum + (s.t1_intentados || 0), 0);
          const t2 = teamStatsInMatch.reduce((sum, s) => sum + (s.t2_intentados || 0), 0); 
          const t3 = teamStatsInMatch.reduce((sum, s) => sum + (s.t3_intentados || 0), 0);
          const fouls = teamStatsInMatch.reduce((sum, s) => 
              sum + (s.faltas_cometidas || 0) + (s.tecnicas || 0) + (s.antideportivas || 0), 0
          );
          
          const t1Pct = t1I > 0 ? (t1A / t1I) * 100 : 0;

          return {
            ...m,
            isLocal,
            opponent: isLocal ? (m.equipo_visitante?.nombre_especifico || 'Rival') : (m.equipo_local?.nombre_especifico || 'Rival'),
            opponentLogo: isLocal ? m.equipo_visitante?.clubs?.logo_url : m.equipo_local?.clubs?.logo_url,
            teamScore: isLocal ? (m.puntos_local ?? 0) : (m.puntos_visitante ?? 0),
            oppScore: isLocal ? (m.puntos_visitante ?? 0) : (m.puntos_local ?? 0),
            stats: { t1A, t1I, t1Pct, t2, t3, fouls }
          };
        });
    } catch (e) {
      console.error("Error processing team matches", e);
      return [];
    }
  }, [matches, stats, equipoId, plantilla]);

  // Procesamiento de jugadores
  const playerStats: PlayerAggregatedStats[] = useMemo(() => {
    try {
      if (!plantilla || !Array.isArray(plantilla)) return [];
      
      return plantilla.map(p => {
          try {
              if (!p) return null;
              const pStats = (stats || []).filter(s => s && String(s.jugador_id) === String(p.jugador_id));
              const playerData = Array.isArray(p.jugadores) ? p.jugadores[0] : p.jugadores;
              const nombre = playerData?.nombre_completo || 'Jugador';
              const fotoUrl = playerData?.foto_url;
              
              const matchIds: string[] = Array.from(new Set(pStats.map(s => String(s.partido_id))));
              const gp = matchIds.length;
              const totalPts = pStats.reduce((sum, s) => sum + (s.puntos || 0), 0);
              
              // Cálculo de minutos totales para MPG (Minutes Per Game)
              const totalMins = pStats.reduce((sum, s) => sum + parseTiempoJugado(s.tiempo_jugado), 0);
              
              const mpg = gp > 0 ? totalMins / gp : 0;

              // Cálculo de PPM solicitado: Puntos Totales / Media de Minutos (MPG)
              const ppm = mpg > 0 ? totalPts / mpg : 0;

              const totalFouls = pStats.reduce((sum, s) => sum + (s.faltas_cometidas || 0), 0);
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
                  ppm: ppm
              } as PlayerAggregatedStats;
          } catch (err) {
              console.error("Error processing player", p, err);
              return null;
          }
      }).filter((p): p is PlayerAggregatedStats => p !== null)
        .sort((a, b) => b.totalPuntos - a.totalPuntos); 
    } catch (e) {
      console.error("Critical error in playerStats useMemo", e);
      return [];
    }
  }, [plantilla, stats, movements, esMini]);

  const getPieColor = (pct: number) => {
    if (isNaN(pct)) return '#fbbf24';
    if (pct < 30) return '#ef4444'; 
    if (pct < 60) return '#fbbf24';
    return '#22c55e';
  };

  if (!plantilla || !matches) {
      return (
          <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 flex flex-col items-center">
              <AlertTriangle className="mb-2" />
              <p className="font-bold text-lg">Datos no disponibles</p>
          </div>
      );
  }

  return (
    <div className="mt-8 animate-fade-in">
      {/* Pestañas Principales */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab('matches')} 
          className={`flex items-center gap-2 px-6 py-3 font-medium text-base transition-colors border-b-2 whitespace-nowrap ${activeTab === 'matches' ? 'border-fcbq-blue text-fcbq-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Calendar size={20} /> Partidos
        </button>
        <button 
          onClick={() => setActiveTab('players')} 
          className={`flex items-center gap-2 px-6 py-3 font-medium text-base transition-colors border-b-2 whitespace-nowrap ${activeTab === 'players' ? 'border-fcbq-blue text-fcbq-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <User size={20} /> Jugadores
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 min-h-[300px]">
        {/* Vista: Partidos */}
        {activeTab === 'matches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {teamMatches.length === 0 && <p className="text-gray-500 col-span-full text-center py-10 italic text-lg">No hay registros de partidos.</p>}
            {teamMatches.map((match) => (
              <div key={match.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white flex flex-col">
                <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex flex-col items-center w-1/3 text-center">
                        <span className="text-xs font-bold text-gray-400 uppercase mb-1">{match.isLocal ? 'Local' : 'Visitante'}</span>
                        <span className={`text-3xl font-bold ${match.teamScore > match.oppScore ? 'text-fcbq-blue' : 'text-gray-600'}`}>{match.teamScore}</span>
                    </div>
                    <div className="flex flex-col items-center w-1/3 text-gray-300">
                        <span className="text-xs font-bold">VS</span>
                        <div className="text-xs mt-1 text-center font-bold text-gray-400 leading-tight uppercase truncate w-full">{match.opponent}</div>
                        <div className="text-[10px] text-gray-500 font-medium mt-1">
                            {match.fecha_hora ? new Date(match.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                        </div>
                    </div>
                    <div className="flex flex-col items-center w-1/3 text-center">
                        <span className="text-xs font-bold text-gray-400 uppercase mb-1">Rival</span>
                        <span className={`text-3xl font-bold ${match.oppScore > match.teamScore ? 'text-fcbq-blue' : 'text-gray-600'}`}>{match.oppScore}</span>
                    </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 flex-1">
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-400 font-bold mb-1 uppercase">T. Libres</span>
                        <div className="w-20 h-20 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <Pie 
                                        data={[{value: match.stats.t1A}, {value: Math.max(0, match.stats.t1I - match.stats.t1A)}]} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius="60%" 
                                        outerRadius="85%" 
                                        cornerRadius={3}
                                        paddingAngle={2}
                                        startAngle={90} 
                                        endAngle={-270} 
                                        dataKey="value" 
                                        stroke="none"
                                    >
                                        <Cell fill={getPieColor(match.stats.t1Pct)} />
                                        <Cell fill="#f3f4f6" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-bold text-gray-600">{Math.round(match.stats.t1Pct)}%</span>
                            </div>
                        </div>
                        <span className="text-xs text-gray-400 mt-1 font-mono font-bold">{match.stats.t1A}/{match.stats.t1I}</span>
                    </div>
                    <div className="flex flex-col justify-center gap-2 text-xs">
                        <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-400 uppercase">T2 Total</span><span className="font-bold text-gray-700">{match.stats.t2}</span></div>
                        <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-400 uppercase">T3 Total</span><span className="font-bold text-gray-700">{match.stats.t3}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400 uppercase">Faltas</span><span className="font-bold text-red-500">{match.stats.fouls}</span></div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vista: Jugadores (Contenedor con sub-navegación) */}
        {activeTab === 'players' && (
          <div className="animate-fade-in">
             <div className="flex justify-end mb-4">
                <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setPlayerViewMode('table')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold uppercase transition-all ${playerViewMode === 'table' ? 'bg-white text-fcbq-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Table size={16} /> Tabla
                    </button>
                    <button 
                        onClick={() => setPlayerViewMode('cards')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold uppercase transition-all ${playerViewMode === 'cards' ? 'bg-white text-fcbq-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutGrid size={16} /> Jugadores
                    </button>
                </div>
             </div>

             {/* Sub-vista: Tabla */}
             {playerViewMode === 'table' && (
                <div className="overflow-x-auto animate-fade-in">
                    <table className="w-full text-base text-left">
                    <thead className="text-xs text-gray-500 font-bold uppercase border-b bg-transparent">
                        <tr>
                        <th className="px-4 py-3 text-center text-gray-400 w-12">#</th>
                        <th className="px-4 py-3">Jugador</th>
                        <th className="px-4 py-3 text-center">PJ</th>
                        <th className="px-4 py-3 text-center">PPG</th>
                        <th className="px-4 py-3 text-center">MPG</th>
                        <th className="px-4 py-3 text-center">PPM</th>
                        <th className="px-4 py-3 text-center">FPG</th>
                        <th className="px-4 py-3 text-center">% T1</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {playerStats.map((player) => {
                            const t1Pct = player.totalTirosLibresIntentados > 0 
                                ? (player.totalTirosLibresAnotados / player.totalTirosLibresIntentados) * 100 
                                : 0;
                            return (
                                <tr key={player.jugadorId} className="hover:bg-blue-50/50 cursor-pointer transition group" onClick={() => setSelectedPlayer(player)}>
                                    <td className="px-4 py-4 text-center text-gray-500 font-mono text-xl">{player.dorsal}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border border-gray-100 shrink-0">
                                                <img 
                                                    src={player.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} 
                                                    className="w-full h-full object-cover" 
                                                    alt={player.nombre} 
                                                />
                                            </div>
                                            <span className="font-semibold text-gray-700 uppercase tracking-tight group-hover:text-fcbq-blue transition-colors text-sm md:text-base">
                                                {player.nombre}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-gray-600">{player.partidosJugados}</td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="font-bold text-fcbq-blue text-lg">{player.ppg.toFixed(1)}</span>
                                    </td>
                                    <td className="px-4 py-4 text-center text-gray-500">{player.mpg.toFixed(1)}</td>
                                    <td className="px-4 py-4 text-center text-gray-500">{player.ppm.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center text-gray-500">{player.fpg.toFixed(1)}</td>
                                    <td className="px-4 py-4 flex justify-center">
                                        <MiniDonut value={t1Pct} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </div>
             )}

             {/* Sub-vista: Tarjetas (Jugadores) */}
             {playerViewMode === 'cards' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                    {playerStats.map((player) => (
                    <div 
                        key={player.jugadorId} 
                        onClick={() => setSelectedPlayer(player)} 
                        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-300 cursor-pointer relative group flex flex-col items-center"
                    >
                        <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 font-bold text-sm px-2.5 py-1 rounded-lg">
                            #{player.dorsal}
                        </div>

                        <div className="w-28 h-28 rounded-full p-1 border border-slate-100 bg-white mb-3 shadow-sm relative group-hover:scale-105 transition-transform duration-300">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
                                <img 
                                    src={player.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} 
                                    className="w-full h-full object-cover" 
                                    alt={player.nombre} 
                                
                                />
                            </div>
                        </div>

                        <h3 className="font-bold text-slate-800 text-base uppercase tracking-wide mb-6 truncate w-full text-center px-2">
                            {player.nombre}
                        </h3>

                        <div className="grid grid-cols-3 w-full border-t border-slate-50 pt-4">
                            <div className="flex flex-col items-center border-r border-slate-100">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">PTS</span>
                                <span className="text-xl font-black text-fcbq-blue leading-none">{player.totalPuntos}</span>
                            </div>
                            <div className="flex flex-col items-center border-r border-slate-100">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">PPG</span>
                                <span className="text-xl font-black text-slate-700 leading-none">{player.ppg.toFixed(1)}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">MPG</span>
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