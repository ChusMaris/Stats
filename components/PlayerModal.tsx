import React, { useMemo } from 'react';
import { PlayerAggregatedStats, EstadisticaJugadorPartido, PartidoMovimiento } from '../types';
import { X, Activity, Calendar, Users, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

interface PlayerModalProps {
  player: PlayerAggregatedStats;
  equipoId: number | string;
  matchStats: EstadisticaJugadorPartido[];
  matches: any[];
  movements: PartidoMovimiento[];
  esMini: boolean;
  onClose: () => void;
}

const getPctColor = (pct: number) => {
  if (pct < 40) return '#ef4444'; // Rojo
  if (pct < 65) return '#f59e0b'; // Naranja/Ámbar
  return '#22c55e'; // Verde
};

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

const MiniDonut = ({ value, size = 48 }: { value: number, size?: number }) => {
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

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Fecha N/D';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Fecha N/D';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return 'Fecha N/D';
  }
};

const PlayerModal: React.FC<PlayerModalProps> = ({ player, equipoId, matchStats, matches, movements, esMini, onClose }) => {

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

  const chartData = useMemo(() => {
    try {
      return (matchStats || []).map(stat => {
        const match = matches.find(m => String(m.id) === String(stat.partido_id));
        const jornada = match?.jornada || 0;
        
        // Identificar Rival
        const isLocal = String(match?.equipo_local_id) === String(equipoId);
        const rival = isLocal 
            ? match?.equipo_visitante?.nombre_especifico || 'Rival' 
            : match?.equipo_local?.nombre_especifico || 'Rival';

        return {
          jornadaNum: jornada,
          name: match ? `J${jornada}` : 'ND',
          puntos: stat.puntos || 0,
          tl: stat.t1_anotados || 0,
          tl_att: stat.t1_intentados || 0,
          rival: rival,
          fecha: formatDate(match?.fecha_hora),
          tlPct: (stat.t1_intentados || 0) > 0 ? (stat.t1_anotados! / stat.t1_intentados!) * 100 : 0,
          originalStat: stat
        };
      }).sort((a, b) => a.jornadaNum - b.jornadaNum);
    } catch (e) {
      console.error("Error generating chart data", e);
      return [];
    }
  }, [matchStats, matches, equipoId]);

  const tlTotalPct = player.totalTirosLibresIntentados > 0 
    ? (player.totalTirosLibresAnotados / player.totalTirosLibresIntentados) * 100 
    : 0;

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
               <h2 className="text-2xl md:text-3xl font-bold leading-tight uppercase tracking-tight">{player.nombre}</h2>
               <div className="flex flex-wrap gap-2 md:gap-3 text-blue-100 text-sm md:text-base mt-2">
                 <span className="bg-white/10 px-3 py-1 rounded font-bold">#{player.dorsal}</span>
                 <span className="bg-white/10 px-3 py-1 rounded font-medium">{player.partidosJugados} PARTIDOS</span>
               </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition -mr-2 -mt-2"><X size={28} /></button>
        </div>
        
        <div className="p-4 md:p-6 space-y-6 md:space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <div className="bg-blue-50 p-4 md:p-5 rounded-lg text-center flex flex-col justify-center border border-blue-100">
                    <p className="text-[10px] md:text-xs text-blue-400 uppercase font-black tracking-widest mb-1">Puntos Totales</p>
                    <p className="text-2xl md:text-3xl font-black text-fcbq-blue">{player.totalPuntos}</p>
                </div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-lg text-center flex flex-col justify-center border border-blue-100">
                    <p className="text-[10px] md:text-xs text-blue-400 uppercase font-black tracking-widest mb-1">PPG</p>
                    <p className="text-2xl md:text-3xl font-black text-fcbq-blue">{player.ppg.toFixed(1)}</p>
                </div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-lg text-center flex flex-col justify-center border border-blue-100">
                    <p className="text-[10px] md:text-xs text-blue-400 uppercase font-black tracking-widest mb-1">Minutos / P</p>
                    <p className="text-2xl md:text-3xl font-black text-fcbq-blue">{player.mpg.toFixed(1)}</p>
                </div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-lg text-center flex flex-col justify-center border border-blue-100">
                    <p className="text-[10px] md:text-xs text-blue-400 uppercase font-black tracking-widest mb-1">PPM</p>
                    <p className="text-2xl md:text-3xl font-black text-fcbq-blue">{player.ppm.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg flex flex-col items-center justify-center col-span-2 sm:col-span-1 lg:col-span-1 border border-blue-100">
                    <p className="text-[10px] md:text-xs text-blue-400 uppercase font-black tracking-widest mb-2">Tiros Libres %</p>
                    <div className="flex flex-col items-center gap-1">
                        <MiniDonut value={tlTotalPct} size={60} />
                        <span className="text-[10px] text-slate-500 font-bold tracking-tighter uppercase mt-1">
                            {player.totalTirosLibresAnotados}/{player.totalTirosLibresIntentados}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Gráfica Evolución Puntos */}
                <div className="bg-white p-3 md:p-4 border rounded-xl shadow-sm">
                    <h3 className="text-sm md:text-base font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest"><Activity className="w-5 h-5 text-fcbq-blue" /> Evolución Puntos</h3>
                    <div className="h-48 md:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                            <YAxis stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} width={25} />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px'}}
                            />
                            <Line type="monotone" dataKey="puntos" stroke="#005eb8" strokeWidth={4} dot={{r: 5, fill: '#005eb8', strokeWidth: 0}} activeDot={{r: 7, strokeWidth: 0}} />
                        </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfica Tiros Libres Restaurada */}
                <div className="bg-white p-3 md:p-4 border rounded-xl shadow-sm flex flex-col">
                    <h3 className="text-sm md:text-base font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest"><TrendingUp className="w-5 h-5 text-fcbq-accent" /> Tiros Libres</h3>
                    <div className="h-48 md:h-64 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} width={25} />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}/>
                          <Bar dataKey="tl_att" name="Intentados" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={16} />
                          <Bar dataKey="tl" name="Anotados" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="pt-2 pb-4">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest border-b pb-2">Detalle por Partido</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...chartData].reverse().map((data, index) => {
                  const stat = data.originalStat;
                  const mins = parseTiempoJugado(stat.tiempo_jugado);
                  
                  return (
                    <div key={index} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-fcbq-blue uppercase tracking-widest mb-1">Jornada {data.jornadaNum}</span>
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar size={12} />
                                <span className="text-[10px] font-bold uppercase">{data.fecha}</span>
                            </div>
                         </div>
                         <span className="text-3xl font-black text-slate-800 leading-none group-hover:text-fcbq-blue transition-colors">{stat.puntos}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                         <Users size={14} className="text-slate-300" />
                         <span className="text-[11px] font-black text-slate-500 uppercase truncate tracking-tight">{data.rival}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Minutos</span>
                           <span className="text-xs font-black text-slate-700">{mins > 0 ? mins.toFixed(0) + "'" : '-'}</span>
                        </div>
                        <div className="flex flex-col text-right">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Faltas</span>
                           <span className="text-xs font-black text-slate-700">{stat.faltas_cometidas || 0}</span>
                        </div>
                      </div>

                      {/* Tiros Libres Mantenidos */}
                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiros Libres</span>
                            <span className="text-[10px] font-black text-slate-600 tracking-widest">
                                {stat.t1_anotados}/{stat.t1_intentados}
                            </span>
                         </div>
                         <MiniDonut value={data.tlPct} size={36} />
                      </div>

                      {/* T2 y T3 Separados solo con Aciertos */}
                      <div className="mt-3 flex gap-2">
                        <div className="flex-1 flex flex-col items-center bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">T2 Aciertos</span>
                            <span className="text-sm font-black text-slate-700 leading-none">{stat.t2_anotados || 0}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">T3 Aciertos</span>
                            <span className="text-sm font-black text-slate-700 leading-none">{stat.t3_anotados || 0}</span>
                        </div>
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