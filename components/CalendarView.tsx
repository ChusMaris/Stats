
import React, { useState } from 'react';
import { Partido, ScoutingReport, Equipo, PlayerAggregatedStats } from '../types';
import { Calendar, Clock, MapPin, BrainCircuit, Info, Target, ChevronUp, Coffee, Swords, Gauge, ScrollText, User, Search, Crosshair, AlertTriangle, TrendingUp, ShieldAlert, Zap, Flame, Activity, Link2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { getTeamScoutingReport } from '../services/dataService';

interface CalendarViewProps {
  matches: Partido[];
  competicionId: number | string;
  equipos: Equipo[];
}

// --- HELPER COMPONENTS FOR VISUALIZATION ---

const getPctColor = (pct: number) => {
  if (pct < 40) return '#ef4444'; // Rojo
  if (pct < 65) return '#f59e0b'; // Naranja/Ámbar
  return '#22c55e'; // Verde
};

const MiniDonut = ({ value, size = 40 }: { value: number, size?: number }) => {
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (normalizedValue / 100) * circumference;
  const color = getPctColor(normalizedValue);
  
  return (
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
              <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="transparent" />
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
          <span className="absolute text-[9px] font-black text-slate-700">{Math.round(normalizedValue)}%</span>
      </div>
  );
};


const CalendarView: React.FC<CalendarViewProps> = ({ matches, competicionId, equipos }) => {
  const [analysis, setAnalysis] = useState<{ [key: string]: ScoutingReport }>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);
  const [visibleReport, setVisibleReport] = useState<string | null>(null);
  
  // Filter state: Default to FALSE (Hide finished rounds)
  const [showFinishedRounds, setShowFinishedRounds] = useState(false);

  // 1. Agrupar partidos por jornada
  const matchesByJornada = matches.reduce((acc, match) => {
    // Filtramos jornada 0 (datos corruptos o no asignados)
    const j = match.jornada || 0;
    if (j === 0) return acc;
    
    if (!acc[j]) acc[j] = [];
    acc[j].push(match);
    return acc;
  }, {} as Record<number, Partido[]>);

  const jornadas = Object.keys(matchesByJornada).map(Number).sort((a, b) => a - b);
  
  // 2. Filter Jornadas based on completion status
  const displayedJornadas = jornadas.filter(jornada => {
      if (showFinishedRounds) return true; // Show all if toggle is ON
      
      const rMatches = matchesByJornada[jornada];
      // Check if ALL matches in this round are played
      const isRoundComplete = rMatches.every(m => m.puntos_local !== null && m.puntos_local !== undefined);
      
      return !isRoundComplete; // Show only if NOT complete
  });

  const handleAnalyze = async (matchId: string | number, teamId: string | number, rivalId: string | number) => {
    const key = String(matchId);
    if (visibleReport === key) {
        setVisibleReport(null);
        return;
    }

    if (analysis[key]) {
        setVisibleReport(key);
        return;
    }

    setLoadingAnalysis(key);
    try {
        // Pass both team ID and Rival ID to generate comparative analysis
        const report = await getTeamScoutingReport(competicionId, teamId, rivalId);
        setAnalysis(prev => ({ ...prev, [key]: report }));
        setVisibleReport(key);
    } catch (error) {
        console.error("Error analyzing match", error);
    } finally {
        setLoadingAnalysis(null);
    }
  };

  const getMatchDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return { date: 'Pendiente', time: '--:--' };
    const date = new Date(dateStr);
    const dateText = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeText = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return { date: dateText, time: timeText };
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      
      {/* Filters Header */}
      <div className="flex justify-end items-center mb-2">
        <button 
            onClick={() => setShowFinishedRounds(!showFinishedRounds)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${showFinishedRounds ? 'bg-fcbq-blue text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
        >
            {showFinishedRounds ? <Eye size={14} /> : <EyeOff size={14} />}
            {showFinishedRounds ? 'Ocultar Jornadas Finalizadas' : 'Ver Jornadas Finalizadas'}
        </button>
      </div>

      {displayedJornadas.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="inline-block p-4 bg-green-50 rounded-full mb-3">
                <Calendar size={32} className="text-green-600" />
              </div>
              <p className="text-slate-800 font-bold text-lg">Todo al día</p>
              <p className="text-slate-500 mb-4">No hay partidos pendientes para mostrar.</p>
              {!showFinishedRounds && jornadas.length > 0 && (
                  <button 
                    onClick={() => setShowFinishedRounds(true)}
                    className="text-fcbq-blue text-sm font-bold hover:underline"
                  >
                      Ver historial de jornadas
                  </button>
              )}
          </div>
      )}
      
      {displayedJornadas.map(jornada => {
        const jornadaMatches = matchesByJornada[jornada];
        
        // Comprobamos si la jornada está "cerrada" (todos los partidos jugados)
        const allPlayed = jornadaMatches.every(m => m.puntos_local !== null && m.puntos_local !== undefined);

        // Calcular equipo que descansa
        const playingTeamIds = new Set<string>();
        jornadaMatches.forEach(m => {
            playingTeamIds.add(String(m.equipo_local_id));
            playingTeamIds.add(String(m.equipo_visitante_id));
        });

        const restingTeams = equipos.filter(e => !playingTeamIds.has(String(e.id)));

        return (
          <div key={jornada} className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in ${allPlayed ? 'opacity-80' : ''}`}>
            {/* Cabecera Jornada */}
            <div className={`w-full flex items-center p-3 border-b border-slate-50 ${allPlayed ? 'bg-slate-50' : 'bg-blue-50/30'}`}>
              <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${allPlayed ? 'bg-slate-300 text-white' : 'bg-fcbq-blue text-white'}`}>
                    J{jornada}
                 </div>
                 <div className="text-left">
                    <span className={`block text-sm font-bold ${allPlayed ? 'text-slate-400' : 'text-slate-700'}`}>Jornada {jornada}</span>
                 </div>
                 {allPlayed && <span className="ml-auto text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Finalizada</span>}
              </div>
            </div>

            {/* Lista de Partidos */}
            <div className="divide-y divide-slate-50">
                {jornadaMatches.map(match => {
                   const isPlayed = match.puntos_local !== null && match.puntos_local !== undefined;
                   const { date, time } = getMatchDateTime(match.fecha_hora);

                   return (
                     <div key={match.id} className={`p-4 transition-colors ${isPlayed ? 'bg-white hover:bg-slate-50' : 'bg-white hover:bg-blue-50/10'}`}>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                           {/* Date & Location */}
                           <div className="flex flex-col items-center md:items-start min-w-[120px] text-center md:text-left">
                              <span className={`text-xs font-bold uppercase px-2 py-1 rounded mb-1 leading-none ${isPlayed ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-fcbq-blue border border-blue-100'}`}>
                                {date}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1 font-bold">
                                <Clock size={11} /> {time}
                              </span>
                           </div>

                           {/* Teams & Score */}
                           <div className="flex-1 flex items-center justify-center gap-4 md:gap-8 w-full">
                              {/* Local */}
                              <div className="flex-1 flex flex-col items-center text-center gap-2">
                                 <div className="w-10 h-10 md:w-12 md:h-12 relative">
                                    <img src={match.equipo_local?.clubs?.logo_url || ''} className={`w-full h-full object-contain ${isPlayed ? 'opacity-70 grayscale-[0.5]' : ''}`} alt="Local" />
                                    {/* SCOUTING LOCAL: Only if NOT played */}
                                    {!isPlayed && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAnalyze(match.id + '_local', match.equipo_local_id, match.equipo_visitante_id); }}
                                            className="absolute -top-2 -right-2 bg-white text-fcbq-blue p-1 rounded-full shadow border hover:bg-blue-50 transition-transform hover:scale-110"
                                            title="Analizar Local"
                                        >
                                            <BrainCircuit size={12} />
                                        </button>
                                    )}
                                 </div>
                                 <span className={`text-xs md:text-sm font-bold leading-tight ${isPlayed ? 'text-slate-500' : 'text-slate-800'}`}>{match.equipo_local?.nombre_especifico}</span>
                              </div>

                              {/* VS or SCORE */}
                              <div className="text-xl md:text-3xl font-black text-slate-800 shrink-0">
                                {isPlayed ? (
                                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                                        <span className="text-slate-600">{match.puntos_local}</span>
                                        <span className="text-slate-300 text-base">-</span>
                                        <span className="text-slate-600">{match.puntos_visitante}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-300 text-2xl">VS</span>
                                )}
                              </div>

                              {/* Visitor */}
                              <div className="flex-1 flex flex-col items-center text-center gap-2">
                                 <div className="w-10 h-10 md:w-12 md:h-12 relative">
                                    <img src={match.equipo_visitante?.clubs?.logo_url || ''} className={`w-full h-full object-contain ${isPlayed ? 'opacity-70 grayscale-[0.5]' : ''}`} alt="Visitante" />
                                    {/* SCOUTING VISITOR: Only if NOT played */}
                                    {!isPlayed && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAnalyze(match.id + '_visitor', match.equipo_visitante_id, match.equipo_local_id); }}
                                            className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow border hover:bg-red-50 transition-transform hover:scale-110"
                                            title="Analizar Visitante"
                                        >
                                            <BrainCircuit size={12} />
                                        </button>
                                    )}
                                 </div>
                                 <span className={`text-xs md:text-sm font-bold leading-tight ${isPlayed ? 'text-slate-500' : 'text-slate-800'}`}>{match.equipo_visitante?.nombre_especifico}</span>
                              </div>
                           </div>
                        </div>

                        {/* Analysis Reports Area (Only visible for non-played) */}
                        {!isPlayed && (
                            <div className="mt-4 flex flex-col gap-2">
                                {/* Local Analysis View */}
                                {visibleReport === (match.id + '_local') && analysis[match.id + '_local'] && (
                                    <ScoutingCard 
                                        report={analysis[match.id + '_local']} 
                                        teamName={match.equipo_local?.nombre_especifico || 'Local'} 
                                        color="blue"
                                        onClose={() => setVisibleReport(null)}
                                    />
                                )}
                                {loadingAnalysis === (match.id + '_local') && <AnalysisLoader />}

                                {/* Visitor Analysis View */}
                                {visibleReport === (match.id + '_visitor') && analysis[match.id + '_visitor'] && (
                                    <ScoutingCard 
                                        report={analysis[match.id + '_visitor']} 
                                        teamName={match.equipo_visitante?.nombre_especifico || 'Visitante'} 
                                        color="red"
                                        onClose={() => setVisibleReport(null)}
                                    />
                                )}
                                {loadingAnalysis === (match.id + '_visitor') && <AnalysisLoader />}

                                {!visibleReport && (
                                    <div className="text-center mt-2 opacity-60 hover:opacity-100 transition-opacity">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1 cursor-help" title="Pulsa los iconos de cerebro para ver estadísticas">
                                            <Info size={10} /> IA Scouting disponible
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                   );
                })}
            </div>
            
            {/* Footer Descansa */}
            {restingTeams.length > 0 && (
                <div className="bg-slate-50/80 p-3 text-center border-t border-slate-100 flex items-center justify-center gap-2">
                    <Coffee size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{restingTeams.map(t => t.nombre_especifico).join(', ')}</span> descansa
                    </span>
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AnalysisLoader = () => (
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-6 flex flex-col items-center justify-center animate-pulse">
        <BrainCircuit size={32} className="text-slate-300 animate-spin mb-2" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analizando datos del rival...</span>
    </div>
);

// --- COMPONENTE DE CARTA DE SCOUTING ---
const ScoutingCard = ({ report, teamName, color, onClose }: { report: ScoutingReport, teamName: string, color: 'blue' | 'red', onClose: () => void }) => {
    const themeClass = color === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-red-50 border-red-100 text-red-900';
    const accentClass = color === 'blue' ? 'text-blue-600' : 'text-red-600';
    const bgAccentClass = color === 'blue' ? 'bg-blue-100' : 'bg-red-100';
    const selectClass = color === 'blue' ? 'focus:ring-blue-400' : 'focus:ring-red-400';

    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
    const selectedPlayer = report.rosterStats?.find(p => String(p.jugadorId) === selectedPlayerId);

    // --- LÓGICA DE PRO PLAYER CARD ---
    const getArchetype = (p: PlayerAggregatedStats) => {
        const t3Vol = p.partidosJugados > 0 ? p.totalTiros3Intentados / p.partidosJugados : 0;
        const ftVol = p.partidosJugados > 0 ? p.totalTirosLibresIntentados / p.partidosJugados : 0;
        const t3Pct = (p.totalTiros3Anotados / (p.totalTiros3Intentados || 1)) * 100;

        if (t3Vol > 4 && t3Pct > 30) return "Francotirador";
        if (ftVol > 4) return "Penetrador/Físico";
        if (p.ppg > 15) return "Estrella Ofensiva";
        if (p.careerStats && p.careerStats.mpg > 25 && p.ppg < 6) return "Especialista Defensivo";
        if (p.careerStats && p.careerStats.gamesPlayed > 50) return "Veterano";
        return "Jugador de Rotación";
    };

    const getTacticalAdvice = (p: PlayerAggregatedStats) => {
        const advice = [];
        const t1Pct = p.t1Pct || 0;
        const recentForm = p.last3PPG || 0;
        
        // Prioridad 1: Situación de Faltas (Muy clara)
        if (t1Pct < 55 && p.totalTirosLibresIntentados > 5) advice.push("Hacer falta: Sufre en TL.");
        else if (t1Pct > 80) advice.push("No regalar faltas: Seguro en TL.");

        // Prioridad 2: Estado de forma (Racha)
        if (recentForm > p.ppg + 4) advice.push("Caliente: Negar recepción.");
        
        // Prioridad 3: Perfil de Tiro (Diferenciando Amenaza Interior vs No Amenaza)
        const t3AttPerGame = p.partidosJugados > 0 ? p.totalTiros3Intentados / p.partidosJugados : 0;
        
        if (t3AttPerGame > 4) {
             advice.push("Puntear siempre: Tira de lejos.");
        } else if (t3AttPerGame < 2) {
            // Tira poco de 3... ¿Pero anota?
            if (p.ppg > 8) {
                // Anota mucho y no tira -> Es peligroso dentro (penetrador o poste)
                advice.push("Cerrar penetración: Peligro interior.");
            } else {
                // No anota mucho y no tira -> Podemos flotar para ayudar a otros
                advice.push("Flotar: Priorizar ayudas.");
            }
        } else {
            advice.push("Defensa estándar.");
        }

        if (advice.length === 0) advice.push("Defensa estándar.");
        return advice[0]; // Retornar el más crítico
    };
    
    // --- DYNAMIC CONTEXT SLOT LOGIC ---
    // Changed priority: 
    // 1. Parallel Context (Linked Player)
    // 2. High Plus Minus (IMPACT PLAYER) - NEW!
    // 3. Strengths (T3)
    // 4. Form 
    // 5. Weaknesses
    const getDynamicContext = (p: PlayerAggregatedStats) => {
        
        // 0. LINKED PLAYER (Parallel Stats) - MAXIMUM PRIORITY
        if (p.parallelStats && p.parallelStats.isPrimaryContext) {
            return {
                type: 'LINKED_PLAYER',
                title: 'Jugador Vinculado',
                icon: <Link2 size={16} className="text-purple-500" />,
                content: (
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black leading-none text-purple-600">
                            {p.parallelStats.ppg.toFixed(1)}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">PPG (Otra Liga)</span>
                            <span className="text-[8px] font-bold text-purple-600 uppercase leading-none mt-0.5">
                                {p.parallelStats.gamesPlayed} partidos jugados
                            </span>
                        </div>
                    </div>
                )
            };
        }

        // 1. High Impact Player (Plus Minus) - NEW
        if (p.avgMasMenos && p.avgMasMenos >= 6 && p.partidosJugados >= 2) {
             return {
                type: 'PM_STRENGTH',
                title: 'Impacto Global (+/-)',
                icon: <Activity size={16} className="text-emerald-600" />,
                content: (
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black leading-none text-emerald-600">
                            +{p.avgMasMenos.toFixed(1)}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Diferencial</span>
                            <span className="text-[8px] font-bold text-emerald-600 uppercase leading-none mt-0.5">
                                Gana por {Math.floor(p.avgMasMenos)} pts con él
                            </span>
                        </div>
                    </div>
                )
            };
        }

        // 2. Strength: 3-Point Specialist (High Volume)
        const t3PerGame = p.partidosJugados > 0 ? p.totalTiros3Anotados / p.partidosJugados : 0;
        
        if (t3PerGame >= 1.0 || p.totalTiros3Anotados >= 5) {
             return {
                type: 'T3_STRENGTH',
                title: 'Amenaza T3',
                icon: <Flame size={16} className="text-indigo-500" />,
                content: (
                    <div className="flex items-center gap-3">
                         <div className="flex flex-col">
                            <span className="text-xl font-black text-indigo-600 leading-none">{p.totalTiros3Anotados}</span>
                            <span className="text-[9px] text-indigo-300 font-bold uppercase">Total T3</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-slate-700 leading-none">{t3PerGame.toFixed(1)}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">/Partido</span>
                        </div>
                    </div>
                )
            };
        }

        // 3. Form: Hot Streak (Racha positiva)
        const diff = (p.last3PPG || 0) - p.ppg;
        const recentTotalPoints = Math.round((p.last3PPG || 0) * (p.lastGamesPlayed || 1));
        
        if (diff > 2) {
             return {
                type: 'FORM_HOT',
                title: 'En Racha',
                icon: <TrendingUp size={16} className="text-green-500" />,
                content: (
                     <div className="flex items-center gap-2">
                        <span className="text-xl font-black leading-none text-green-600">
                            {recentTotalPoints}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Puntos Totales</span>
                            <span className="text-[8px] font-bold text-green-600 uppercase leading-none mt-0.5">en los últ. {p.lastGamesPlayed} part.</span>
                        </div>
                    </div>
                )
            };
        }

        // 4. Weakness: Bad Free Throw Shooter
        if (p.totalTirosLibresIntentados > 8 && (p.t1Pct || 0) < 60) {
            return {
                type: 'FT_WEAKNESS',
                title: 'Punto Débil: TL',
                icon: <AlertTriangle size={16} className="text-orange-500" />,
                content: (
                    <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-slate-700 leading-none">{(p.t1Pct || 0).toFixed(0)}%</span>
                            <span className="text-[9px] text-slate-400 font-bold">{p.totalTirosLibresAnotados}/{p.totalTirosLibresIntentados} TL</span>
                        </div>
                        <MiniDonut value={p.t1Pct || 0} size={32} />
                    </div>
                )
            };
        }
        
        // 5. Default: Total Points (Season)
        return {
            type: 'SEASON_TOTAL',
            title: 'Total Puntos',
            icon: <Activity size={16} className="text-slate-400" />,
            content: (
                 <div className="flex items-center gap-2">
                    <span className="text-xl font-black leading-none text-slate-700">
                        {p.totalPuntos}
                    </span>
                    <div className="flex flex-col">
                         <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Acumulados</span>
                         <span className="text-[8px] font-bold text-slate-500 uppercase leading-none mt-0.5">en {p.partidosJugados} partidos</span>
                    </div>
                </div>
            )
        };
    };

    const dynamicContext = selectedPlayer ? getDynamicContext(selectedPlayer) : null;

    return (
        <div className={`relative rounded-xl border p-5 ${themeClass} animate-fade-in shadow-lg`}>
            <button onClick={onClose} className="absolute top-2 right-2 p-1 hover:bg-white/50 rounded-full transition-colors opacity-50 hover:opacity-100">
                <ChevronUp size={18} />
            </button>
            
            <div className="flex items-center gap-2 mb-4 border-b border-black/5 pb-2">
                <BrainCircuit className={accentClass} size={20} />
                <h4 className="font-bold text-lg leading-none">Scouting: <span className="opacity-75">{teamName}</span></h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Insights - The "Smart" Part */}
                <div className="space-y-3">
                    <h5 className="text-xs font-black uppercase tracking-widest opacity-60 mb-2 flex items-center gap-1"><Info size={12} /> Análisis de Equipo</h5>
                    {report.insights.length > 0 ? (
                        <ul className="space-y-2">
                            {report.insights.map((insight, idx) => (
                                <li key={idx} className="text-sm font-medium bg-white/60 p-2 rounded-lg border border-white/50 shadow-sm flex items-start gap-2 leading-snug">
                                    <span className="mt-0.5">👉</span>
                                    <span>{insight}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm italic opacity-70">No hay datos suficientes para generar claves.</p>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                        <div className={`flex-1 p-2 rounded-lg text-center ${bgAccentClass}`}>
                            <span className="block text-[10px] font-black uppercase opacity-60">Racha (5)</span>
                            <div className="flex justify-center gap-0.5 mt-1">
                                {report.teamStats.last5Form.map((r, i) => (
                                    <span key={i} className={`w-2 h-2 rounded-full ${r === 'W' ? 'bg-green-500' : r === 'L' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                                ))}
                                {report.teamStats.last5Form.length === 0 && <span className="text-xs">-</span>}
                            </div>
                        </div>
                        <div className={`flex-1 p-2 rounded-lg text-center ${bgAccentClass}`}>
                            <span className="block text-[10px] font-black uppercase opacity-60">PPG (Anotación)</span>
                            <span className="block text-xl font-black leading-none mt-1">{report.teamStats.ppg.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                {/* Key Players & Roster Selector */}
                <div>
                     <h5 className="text-xs font-black uppercase tracking-widest opacity-60 mb-2 flex items-center gap-1"><Target size={12} /> Jugadores Clave</h5>
                     
                     {/* Manual Selector */}
                     <div className="relative mb-3">
                        <select 
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className={`w-full p-2 pl-8 text-sm font-bold rounded-lg border-none shadow-sm bg-white/80 ${selectClass} focus:ring-2 outline-none appearance-none cursor-pointer hover:bg-white transition-colors`}
                        >
                            <option value="">🔍 Analizar jugador específico...</option>
                            {report.rosterStats?.map(p => (
                                <option key={p.jugadorId} value={p.jugadorId}>#{p.dorsal} - {p.nombre} ({p.ppg.toFixed(1)} ppg)</option>
                            ))}
                        </select>
                        <Search size={14} className="absolute left-2.5 top-2.5 opacity-40 pointer-events-none" />
                     </div>

                     {/* Selected Player PRO CARD Analysis View */}
                     {selectedPlayer && dynamicContext ? (
                        <div className="bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-fade-in ring-2 ring-black/5">
                            {/* Header Card with Watermark */}
                            <div className={`p-4 text-white relative overflow-hidden ${color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-red-600 to-red-500'}`}>
                                {/* Watermark Number with Hash */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center select-none pointer-events-none z-0 tracking-tighter opacity-20 pr-2">
                                    <span className="text-[4rem] font-black text-white leading-none mr-1">#</span>
                                    <span className="text-[6rem] font-black text-white leading-none">{selectedPlayer.dorsal}</span>
                                </div>
                                
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/40 shadow-sm">
                                        <img src={selectedPlayer.fotoUrl || ''} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-xl leading-none tracking-tight shadow-black drop-shadow-sm">{selectedPlayer.nombre}</span>
                                            <div className="flex gap-2 mt-1">
                                                {/* NEW: Display Linked Player Badge */}
                                                {selectedPlayer.parallelStats && selectedPlayer.parallelStats.isPrimaryContext ? (
                                                     <span className="text-[10px] font-bold uppercase tracking-widest bg-purple-500/90 border border-white/20 px-1.5 py-0.5 rounded text-white flex items-center gap-1 shadow-sm">
                                                        <Link2 size={10} /> Vinculado / Refuerzo
                                                     </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-1.5 py-0.5 rounded text-white">
                                                        {getArchetype(selectedPlayer)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="p-3 grid grid-cols-4 gap-2 border-b border-slate-100">
                                <div className="text-center">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">PPG</span>
                                    <span className="block text-lg font-black text-slate-800 leading-none">{(selectedPlayer.ppg || 0).toFixed(1)}</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase" title="Minutos por Partido">MIN/P</span>
                                    <span className="block text-lg font-black text-slate-800 leading-none">{(selectedPlayer.mpg || 0).toFixed(0)}</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase" title="Faltas por Partido">FAL/P</span>
                                    <span className="block text-lg font-black text-slate-800 leading-none">{(selectedPlayer.fpg || 0).toFixed(1)}</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase" title="% de Puntos del Equipo">% PTS</span>
                                    <span className="block text-lg font-black text-slate-800 leading-none">{(selectedPlayer.pointsShare || 0).toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* Scoring DNA (Visual Bar) */}
                            <div className="p-3 border-b border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex justify-between">
                                    <span>ADN de Anotación (Volumen)</span>
                                </span>
                                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                    {/* T3 */}
                                    <div style={{ width: `${(selectedPlayer.totalTiros3Anotados / (selectedPlayer.totalPuntos || 1)) * 300}%` }} className="bg-indigo-500 h-full" title="Triples"></div>
                                    {/* T2 (aprox) */}
                                    <div className="bg-emerald-500 h-full flex-1" title="Tiros de 2"></div>
                                    {/* T1 */}
                                    <div style={{ width: `${(selectedPlayer.totalTirosLibresAnotados / (selectedPlayer.totalPuntos || 1)) * 100}%` }} className="bg-amber-400 h-full" title="Tiros Libres"></div>
                                </div>
                                <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 uppercase">
                                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Triple</span>
                                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Juego T2</span>
                                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Libres</span>
                                </div>
                            </div>

                            {/* DYNAMIC SLOT + TACTICAL ADVICE */}
                            <div className="p-3 grid grid-cols-2 gap-3 bg-slate-50/50">
                                {/* DYNAMIC SLOT REPLACEMENT */}
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                        {dynamicContext.title}
                                    </span>
                                    {dynamicContext.content}
                                </div>
                                
                                {/* TACTICAL ADVICE */}
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Táctica Sugerida</span>
                                    <div className="flex items-start gap-1.5">
                                        <ShieldAlert size={14} className="text-slate-600 mt-0.5 shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-700 leading-tight">{getTacticalAdvice(selectedPlayer)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                     ) : (
                         /* Default Top Players View (Hidden if manual selection active) */
                         <div className="space-y-2 opacity-80">
                             {/* Top Scorer */}
                             {report.keyPlayers.topScorer && (
                                <div className="bg-white/60 p-2 rounded-lg border border-white/50 flex items-center gap-3 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                                        #{report.keyPlayers.topScorer.dorsal}
                                    </div>
                                    <div className="leading-tight flex-1">
                                        <p className="text-[10px] font-bold uppercase opacity-60 flex items-center gap-1">
                                            <Target size={10} /> Líder Anotación
                                        </p>
                                        <p className="font-bold text-sm text-slate-800">
                                            {report.keyPlayers.topScorer.nombre} 
                                            <span className="text-fcbq-blue ml-1">({report.keyPlayers.topScorer.ppg.toFixed(1)} ppg)</span>
                                        </p>
                                    </div>
                                </div>
                             )}

                             {/* Top Shooter */}
                             {report.keyPlayers.topShooter && (
                                 <div className="bg-white/60 p-2 rounded-lg border border-white/50 flex items-center gap-3 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        #{report.keyPlayers.topShooter.dorsal}
                                    </div>
                                    <div className="leading-tight flex-1">
                                        <p className="text-[10px] font-bold uppercase opacity-60 flex items-center gap-1">
                                            <Crosshair size={10} /> Amenaza Exterior
                                        </p>
                                        <p className="font-bold text-sm text-slate-800">
                                            {report.keyPlayers.topShooter.nombre}
                                            <span className="text-blue-600 ml-1">
                                                ({(report.keyPlayers.topShooter.totalTiros3Anotados / report.keyPlayers.topShooter.partidosJugados).toFixed(1)} T3/p)
                                            </span>
                                        </p>
                                    </div>
                                </div>
                             )}

                             {/* Bad FT Shooter */}
                             {report.keyPlayers.badFreeThrowShooter && (
                                 <div className="bg-red-50/60 p-2 rounded-lg border border-red-100 flex items-center gap-3 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        #{report.keyPlayers.badFreeThrowShooter.dorsal}
                                    </div>
                                    <div className="leading-tight flex-1">
                                        <p className="text-[10px] font-bold uppercase opacity-60 flex items-center gap-1 text-red-700">
                                            <AlertTriangle size={10} /> Sufridor Tiros Libres
                                        </p>
                                        <p className="font-bold text-sm text-slate-800">
                                            {report.keyPlayers.badFreeThrowShooter.nombre}
                                            <span className="text-red-600 ml-1">
                                                ({report.keyPlayers.badFreeThrowShooter.t1Pct?.toFixed(0)}%)
                                            </span>
                                        </p>
                                    </div>
                                </div>
                             )}
                         </div>
                     )}
                </div>
            </div>

            {/* Match Analysis Section */}
            {report.matchAnalysis && (
                <div className="mt-5 pt-4 border-t border-black/10">
                    <h5 className="text-xs font-black uppercase tracking-widest opacity-80 mb-3 flex items-center gap-1"><ScrollText size={12} /> Análisis Táctico del Encuentro</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white/60 p-3 rounded-lg border border-white/50">
                            <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                                <Gauge size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Pronóstico</span>
                            </div>
                            <p className="text-sm font-bold leading-tight text-slate-800">{report.matchAnalysis.prediction}</p>
                        </div>
                        <div className="bg-white/60 p-3 rounded-lg border border-white/50">
                            <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                                <Swords size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Duelo Clave</span>
                            </div>
                            <p className="text-sm font-bold leading-tight text-slate-800">{report.matchAnalysis.keyMatchup}</p>
                        </div>
                        <div className="bg-white/60 p-3 rounded-lg border border-white/50">
                             <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                                <ActivityIcon size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Ritmo de Juego</span>
                            </div>
                            <p className="text-sm font-bold leading-tight text-slate-800">{report.matchAnalysis.tempoAnalysis}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Icon component
const ActivityIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export default CalendarView;
