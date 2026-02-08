import React, { useMemo } from 'react';
import { PlayerAggregatedStats, EstadisticaJugadorPartido, PartidoMovimiento } from '../types';
import { X, Activity, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

interface PlayerModalProps {
  player: PlayerAggregatedStats;
  matchStats: EstadisticaJugadorPartido[];
  matches: any[];
  movements: PartidoMovimiento[];
  esMini: boolean;
  onClose: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const intentados = payload.find((p: any) => p.dataKey === 'tl_att')?.value || 0;
    const anotados = payload.find((p: any) => p.dataKey === 'tl')?.value || 0;
    const pct = intentados > 0 ? ((anotados / intentados) * 100).toFixed(0) : 0;

    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm z-50">
        <p className="font-bold text-gray-700 mb-2 border-b border-gray-100 pb-1">{label}</p>
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-gray-200"></div>
            <span className="text-gray-500">Intentados</span>
          </div>
          <span className="font-bold text-gray-800">{intentados}</span>
        </div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-amber-400"></div>
            <span className="text-gray-500">Anotados</span>
          </div>
          <span className="font-bold text-gray-800">{anotados}</span>
        </div>
        <div className="pt-2 border-t border-gray-50 flex justify-between items-center gap-4">
           <span className="text-gray-400">% Acierto</span>
           <span className={`font-bold px-2 py-0.5 rounded ${parseInt(pct.toString()) >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{pct}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const PlayerModal: React.FC<PlayerModalProps> = ({ player, matchStats, matches, movements, esMini, onClose }) => {

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

  const chartData = useMemo(() => {
    try {
      return (matchStats || []).map(stat => {
        const match = matches.find(m => m.id === stat.partido_id);
        const jornada = match?.jornada || 0;
        const anotados = stat.t1_anotados || 0;
        const intentados = stat.t1_intentados || 0;
        
        return {
          jornadaNum: jornada,
          name: match ? `J${jornada}` : 'ND',
          puntos: stat.puntos || 0,
          tl: anotados,
          tl_missed: Math.max(0, intentados - anotados),
          tl_att: intentados,
          originalStat: stat
        };
      }).sort((a, b) => a.jornadaNum - b.jornadaNum);
    } catch (e) {
      console.error("Error generating chart data", e);
      return [];
    }
  }, [matchStats, matches]);

  const tlPct = player.totalTirosLibresIntentados > 0 
    ? (player.totalTirosLibresAnotados / player.totalTirosLibresIntentados) * 100 
    : 0;

  const getPieColor = (pct: number) => {
    if (isNaN(pct)) return '#fbbf24';
    if (pct < 30) return '#ef4444'; 
    if (pct < 60) return '#fbbf24';
    return '#22c55e';
  };

  const pieColor = getPieColor(tlPct);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 md:pt-32 bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] md:max-h-[80vh] overflow-y-auto flex flex-col animate-fade-in relative">
        <div className="bg-fcbq-blue text-white p-6 flex justify-between items-start sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white shrink-0">
                <img 
                    src={player.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} 
                    alt={player.nombre} 
                    className="w-full h-full object-cover" 
                />
             </div>
             <div>
               <h2 className="text-2xl md:text-3xl font-bold leading-tight">{player.nombre}</h2>
               <div className="flex flex-wrap gap-2 md:gap-3 text-blue-100 text-sm md:text-base mt-2">
                 <span className="bg-white/10 px-3 py-1 rounded">#{player.dorsal}</span>
                 <span className="bg-white/10 px-3 py-1 rounded">{player.partidosJugados} PJ</span>
                 <span className="bg-white/10 px-3 py-1 rounded">{player.ppg.toFixed(1)} PPG</span>
               </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition -mr-2 -mt-2"><X size={28} /></button>
        </div>
        <div className="p-4 md:p-6 space-y-6 md:space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-blue-50 p-4 md:p-5 rounded-lg text-center flex flex-col justify-center"><p className="text-xs md:text-sm text-gray-500 uppercase font-bold">Puntos Totales</p><p className="text-2xl md:text-3xl font-bold text-fcbq-blue">{player.totalPuntos}</p></div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-lg text-center flex flex-col justify-center"><p className="text-xs md:text-sm text-gray-500 uppercase font-bold">Minutos / P</p><p className="text-2xl md:text-3xl font-bold text-fcbq-blue">{player.mpg.toFixed(1)}</p></div>
                <div className="bg-blue-50 p-3 rounded-lg flex flex-col items-center justify-center">
                    <p className="text-xs md:text-sm text-gray-500 uppercase font-bold mb-2">Tiros Libres %</p>
                    <div className="w-14 h-14 md:w-20 md:h-20 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                  data={[{ value: player.totalTirosLibresAnotados }, { value: Math.max(0, player.totalTirosLibresIntentados - player.totalTirosLibresAnotados) }]} 
                                  cx="50%" 
                                  cy="50%" 
                                  innerRadius="65%" 
                                  outerRadius="90%" 
                                  cornerRadius={3}
                                  paddingAngle={2}
                                  startAngle={90} 
                                  endAngle={-270} 
                                  dataKey="value" 
                                  stroke="none"
                                >
                                    <Cell fill={pieColor} />
                                    <Cell fill="#f3f4f6" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-xs md:text-sm font-bold text-gray-700">{Math.round(tlPct)}%</span>
                        </div>
                    </div>
                    <span className="text-xs md:text-sm text-gray-500 font-medium mt-1">{player.totalTirosLibresAnotados}/{player.totalTirosLibresIntentados}</span>
                </div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-lg text-center flex flex-col justify-center"><p className="text-xs md:text-sm text-gray-500 uppercase font-bold">Puntos / Min</p><p className="text-2xl md:text-3xl font-bold text-fcbq-blue">{player.ppm.toFixed(2)}</p></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white p-3 md:p-4 border rounded-xl shadow-sm">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 md:w-6 md:h-6 text-fcbq-accent" /> Evolución Puntos</h3>
                    <div className="h-48 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#9ca3af" tick={{fontSize: 12}} axisLine={false} tickLine={false} width={30} />
                          <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                          />
                          <Line type="monotone" dataKey="puntos" stroke="#005eb8" strokeWidth={3} dot={{r: 4, fill: '#005eb8', strokeWidth: 0}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-3 md:p-4 border rounded-xl shadow-sm flex flex-col">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-fcbq-accent" /> Tiros Libres</h3>
                    <div className="h-48 md:h-64 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#9ca3af" tick={{fontSize: 12}} axisLine={false} tickLine={false} width={30} />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                          <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '12px' }}/>
                          <Bar dataKey="tl_att" name="Intentados" fill="#e5e7eb" radius={[2, 2, 0, 0]} barSize={20} />
                          <Bar dataKey="tl" name="Anotados" fill="#fbbf24" radius={[2, 2, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="pt-2 pb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Detalle por Partido</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...chartData].reverse().map((data, index) => {
                  const stat = data.originalStat;
                  const mins = parseTiempoJugado(stat.tiempo_jugado);
                  
                  return (
                    <div key={index} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">JORNADA {data.jornadaNum}</span>
                        <span className="text-2xl font-bold text-fcbq-blue leading-none">{stat.puntos} <span className="text-sm text-gray-400 font-medium ml-0.5">pts</span></span>
                      </div>
                      <div className="h-px bg-gray-100 w-full mb-3"></div>
                      <div className="flex justify-between items-center text-sm mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">Minutos:</span>
                          <span className="font-bold text-gray-700">{mins > 0 ? mins.toFixed(0) + "'" : '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">Faltas:</span>
                          <span className="font-bold text-gray-800">{stat.faltas_cometidas || 0}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Tiros (1/2/3):</span>
                        <span className="font-bold text-gray-800 tracking-wide font-mono">
                          {stat.t1_anotados}/{stat.t1_intentados} &middot; {stat.t2_anotados}/{stat.t2_intentados} &middot; {stat.t3_anotados}/{stat.t3_intentados}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;