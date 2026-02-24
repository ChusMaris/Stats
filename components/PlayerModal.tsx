
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlayerAggregatedStats, EstadisticaJugadorPartido, PartidoMovimiento } from '../types';
import { X, Activity, Calendar, Users, TrendingUp, LayoutDashboard, History, Clock, Target, AlertCircle, PlusCircle, MinusCircle } from 'lucide-react';
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

const SHOOTING_FOUL_IDS = ['160', '161', '162', '165', '166', '537', '540', '544', '549'];

const getPctColor = (pct: number) => {
  if (pct < 40) return '#ef4444'; // Rojo
  if (pct < 65) return '#f59e0b'; // Naranja/Ámbar
  return '#22c55e'; // Verde
};

// --- TOOLTIP COMPONENT ---
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

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Fecha N/D';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Fecha N/D';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return 'Fecha N/D';
  }
};

const PlayerModal: React.FC<PlayerModalProps> = ({ player, equipoId, matchStats, matches, movements, esMini, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matches'>('overview');

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

        // Calcular Faltas de Tiro para este partido
        const matchMovements = movements.filter(m => String(m.partido_id) === String(stat.partido_id) && String(m.jugador_id) === String(player.jugadorId));
        const faltasTiro = matchMovements.filter(m => SHOOTING_FOUL_IDS.includes(String(m.tipo_movimiento))).length;

        return {
          jornadaNum: jornada,
          name: `J${jornada}`,
          fullDate: formatDate(match?.fecha_hora),
          puntos: stat.puntos || 0,
          tl: stat.t1_anotados || 0,
          tl_att: stat.t1_intentados || 0,
          rival: rival,
          faltasTiro: faltasTiro,
          plusMinus: stat.mas_menos !== undefined ? stat.mas_menos : null, // Pass through +/-
          tlPct: (stat.t1_intentados || 0) > 0 ? (stat.t1_anotados! / stat.t1_intentados!) * 100 : 0,
          originalStat: stat
        };
      }).sort((a, b) => a.jornadaNum - b.jornadaNum);
    } catch (e) {
      console.error("Error generating chart data", e);
      return [];
    }
  }, [matchStats, matches, equipoId, movements, player.jugadorId]);

  const tlTotalPct = player.totalTirosLibresIntentados > 0 
    ? (player.totalTirosLibresAnotados / player.totalTirosLibresIntentados) * 100 
    : 0;

  // Determine +/- Color
  const getPlusMinusColor = (val: number | null | undefined) => {
      if (val === undefined || val === null) return 'text-slate-400';
      if (val > 0) return 'text-green-600';
      if (val < 0) return 'text-red-600';
      return 'text-slate-500';
  };

  const getPlusMinusBg = (val: number | null | undefined) => {
      if (val === undefined || val === null) return 'bg-slate-50';
      if (val > 0) return 'bg-green-50';
      if (val < 0) return 'bg-red-50';
      return 'bg-slate-50';
  };

  // PORTAL IMPLEMENTATION: 
  // Renders the modal directly into document.body to escape any parent Z-Index stacking contexts (like the sticky header).
  // Also added 'pt-20 md:pt-36' to create the visual margin from the top.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-center items-start pt-20 md:pt-36 pb-4 px-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in overflow-hidden">
      {/* Click outside to close area */}
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="bg-slate-50 w-full md:w-[90%] md:max-w-4xl max-h-full rounded-2xl shadow-2xl flex flex-col relative z-10 overflow-hidden">
        
        {/* HEADER: Re-designed with Blue Background & Big Dorsal */}
        <div className="bg-fcbq-blue text-white p-6 relative overflow-hidden shrink-0 shadow-sm min-h-[130px] flex items-center">
             
             {/* Watermark Number - Restored Design & Moved Left */}
             <div className="absolute right-16 top-1/2 -translate-y-1/2 flex items-baseline select-none pointer-events-none z-0 opacity-10">
                  <span className="text-[4rem] font-black text-white leading-none mr-2">#</span>
                  <span className="text-[10rem] font-black text-white leading-none tracking-tighter transform translate-y-2">{player.dorsal}</span>
             </div>

             <div className="relative z-10 flex items-center gap-5 w-full pr-12">
                 <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 p-1 shrink-0 backdrop-blur-sm border-2 border-white/20 shadow-lg">
                    <img 
                        src={player.fotoUrl || "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/41uEQx58oj4zwPoOkM6uEO_w585h427.png"} 
                        alt={player.nombre} 
                        className="w-full h-full object-cover rounded-full" 
                    />
                 </div>
                 
                 <div className="flex-1 min-w-0">
                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none truncate drop-shadow-sm">{player.nombre}</h2>
                 </div>
             </div>

             <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-all text-white z-50 backdrop-blur-sm"
             >
                <X size={20} />
             </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="px-4 md:px-6 pt-4 pb-0 bg-white border-b border-slate-100 shrink-0">
            <div className="flex gap-6">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${activeTab === 'overview' ? 'border-fcbq-blue text-fcbq-blue' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <LayoutDashboard size={16} /> Resumen
                </button>
                <button 
                    onClick={() => setActiveTab('matches')}
                    className={`flex items-center gap-2 pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${activeTab === 'matches' ? 'border-fcbq-blue text-fcbq-blue' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <History size={16} /> Partidos <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full text-[10px] ml-1">{chartData.length}</span>
                </button>
            </div>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="overflow-y-auto p-4 md:p-6 flex-1 bg-slate-50">
            
            {/* --- TAB 1: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* Primary KPIs - Hero Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                             <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity text-fcbq-blue"><Activity size={40} /></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Puntos / Partido</span>
                             <span className="text-3xl md:text-4xl font-black text-fcbq-blue tracking-tight">{player.ppg.toFixed(1)}</span>
                             <span className="text-[10px] font-bold text-slate-400 mt-1">Total: {player.totalPuntos}</span>
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                             <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500"><TrendingUp size={40} /></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Puntos / Minuto</span>
                             <span className="text-3xl md:text-4xl font-black text-slate-700 tracking-tight">{player.ppm.toFixed(2)}</span>
                             <span className="text-[10px] font-bold text-emerald-600 mt-1">Eficiencia Ofensiva</span>
                        </div>

                         {/* NEW PLUS MINUS CARD */}
                         <div className={`p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group ${player.avgMasMenos && player.avgMasMenos > 0 ? 'bg-green-50/50' : player.avgMasMenos && player.avgMasMenos < 0 ? 'bg-red-50/50' : 'bg-white'}`}>
                             <div className={`absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity ${getPlusMinusColor(player.avgMasMenos)}`}><Activity size={40} /></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">+/- Promedio</span>
                             <span className={`text-3xl md:text-4xl font-black tracking-tight ${getPlusMinusColor(player.avgMasMenos)}`}>
                                {player.avgMasMenos !== undefined && player.avgMasMenos > 0 ? '+' : ''}
                                {player.avgMasMenos !== undefined ? player.avgMasMenos.toFixed(1) : '-'}
                             </span>
                             <span className="text-[10px] font-bold text-slate-400 mt-1">Total: {player.totalMasMenos !== undefined && player.totalMasMenos > 0 ? '+' : ''}{player.totalMasMenos ?? '-'}</span>
                        </div>

                         <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                             <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity text-rose-500"><Target size={40} /></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiros Libres %</span>
                             <div className="flex items-center gap-2">
                                <span className="text-3xl md:text-4xl font-black text-slate-700 tracking-tight">{tlTotalPct.toFixed(0)}<span className="text-lg text-slate-400">%</span></span>
                             </div>
                             <span className="text-[10px] font-bold text-slate-400 mt-1">{player.totalTirosLibresAnotados}/{player.totalTirosLibresIntentados} Anotados</span>
                        </div>
                    </div>

                    {/* Secondary Stats Strip */}
                    <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <div className="text-center border-r border-slate-50 last:border-0">
                            <span className="block text-xl font-black text-slate-700 leading-none">{player.mpg.toFixed(1)}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Minutos / Part.</span>
                        </div>
                        <div className="text-center border-r border-slate-50 last:border-0">
                            <span className="block text-xl font-black text-slate-700 leading-none">{player.totalFaltas}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Faltas Totales</span>
                        </div>
                         <div className="text-center border-r border-slate-50 last:border-0">
                            <span className="block text-xl font-black text-slate-700 leading-none">{player.totalFaltasTiro}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Faltas de Tiro</span>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* Gráfica Evolución Puntos */}
                        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm">
                            <h3 className="text-xs font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest"><Activity className="w-4 h-4 text-fcbq-blue" /> Evolución Anotadora</h3>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} width={25} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px'}}
                                    />
                                    <Line type="monotone" dataKey="puntos" stroke="#005eb8" strokeWidth={3} dot={{r: 4, fill: '#005eb8', strokeWidth: 0}} activeDot={{r: 6, strokeWidth: 0}} />
                                </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráfica Tiros Libres */}
                        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm">
                            <h3 className="text-xs font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest"><TrendingUp className="w-4 h-4 text-fcbq-accent" /> Efectividad TL</h3>
                            <div className="h-56">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                                  <YAxis stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} width={25} />
                                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}/>
                                  <Bar dataKey="tl_att" name="Intentados" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={12} />
                                  <Bar dataKey="tl" name="Anotados" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={12} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: MATCHES (GAME LOG) --- */}
            {activeTab === 'matches' && (
                <div className="animate-fade-in space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {[...chartData].reverse().map((data, index) => {
                          const stat = data.originalStat;
                          const mins = parseTiempoJugado(stat.tiempo_jugado);
                          
                          return (
                            <div key={index} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-slate-50 to-white rounded-bl-full -mr-8 -mt-8 z-0"></div>
                              
                              <div className="flex justify-between items-start mb-3 relative z-10">
                                 <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Jornada {data.jornadaNum}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{data.fullDate}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                        <span className="text-xs font-bold text-slate-600 uppercase truncate max-w-[140px]" title={data.rival}>{data.rival}</span>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end">
                                     <span className="text-3xl font-black text-fcbq-blue leading-none">{stat.puntos}</span>
                                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Puntos</span>
                                 </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-50 relative z-10">
                                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg">
                                   <span className="text-lg font-black text-slate-700 leading-none">{mins > 0 ? mins.toFixed(0) + "'" : '-'}</span>
                                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Minutos</span>
                                </div>
                                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg relative overflow-hidden">
                                   <span className="text-lg font-black text-slate-700 leading-none">
                                     {stat.faltas_cometidas || 0}
                                   </span>
                                   {data.faltasTiro > 0 && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" title="Falta de tiro"></div>}
                                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Faltas</span>
                                </div>
                                {/* NEW PLUS MINUS SLOT IN CARD */}
                                <div className={`flex flex-col items-center p-2 rounded-lg ${getPlusMinusBg(data.plusMinus)}`}>
                                   <span className={`text-lg font-black leading-none ${getPlusMinusColor(data.plusMinus)}`}>
                                        {data.plusMinus !== null && data.plusMinus > 0 ? '+' : ''}{data.plusMinus ?? '-'}
                                   </span>
                                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">+/-</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {chartData.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <AlertCircle className="mx-auto mb-2" />
                            <p>No hay datos de partidos disponibles.</p>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlayerModal;
