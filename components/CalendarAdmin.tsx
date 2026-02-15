
import React, { useState, useEffect, useRef } from 'react';
import { Equipo, Partido } from '../types';
import { Calendar, Clock, Plus, Save, AlertCircle, CheckCircle2, Pencil, Trash2, X, Filter, Eye, EyeOff } from 'lucide-react';
import { createCalendarioEntry, updateCalendarioEntry, updatePartidoEntry, deleteMatch } from '../services/dataService';

interface CalendarAdminProps {
  equipos: Equipo[];
  competicionId: number | string;
  matches: Partido[];
  onMatchAdded: () => void;
}

const CalendarAdmin: React.FC<CalendarAdminProps> = ({ equipos, competicionId, matches, onMatchAdded }) => {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [jornada, setJornada] = useState<number>(1);
  const [fecha, setFecha] = useState<string>('');
  const [hora, setHora] = useState<string>('12:00');
  const [localId, setLocalId] = useState<string>('');
  const [visitorId, setVisitorId] = useState<string>('');
  
  // State for filtering the list
  const [filterTeamId, setFilterTeamId] = useState<string>('');
  // New State: Default hidden played matches
  const [showPlayedMatches, setShowPlayedMatches] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Ref to track if we should scroll to bottom after an update (specifically for creation)
  const shouldScrollToBottomRef = useRef(false);

  // Ordenar equipos alfabéticamente para los selectores
  const sortedEquipos = [...equipos].sort((a, b) => 
      (a.nombre_especifico || '').localeCompare(b.nombre_especifico || '')
  );

  const localTeam = equipos.find(e => String(e.id) === localId);
  const visitorTeam = equipos.find(e => String(e.id) === visitorId);
  
  const listRef = useRef<HTMLDivElement>(null);

  // Ordenar todos los partidos por Jornada y Fecha
  const allMatchesSorted = [...matches].sort((a, b) => {
      const jDiff = (a.jornada || 0) - (b.jornada || 0);
      if (jDiff !== 0) return jDiff;
      return new Date(a.fecha_hora || 0).getTime() - new Date(b.fecha_hora || 0).getTime();
  });

  // Filter matches based on selection AND Played Status
  const filteredMatches = allMatchesSorted.filter(m => {
      // 1. Check Team Filter
      if (filterTeamId) {
          if (String(m.equipo_local_id) !== filterTeamId && String(m.equipo_visitante_id) !== filterTeamId) {
              return false;
          }
      }
      
      // 2. Check Played Status Filter
      if (!showPlayedMatches) {
          const isPlayed = m.puntos_local !== null && m.puntos_local !== undefined;
          if (isPlayed) return false;
      }

      return true;
  });

  // Efecto para Auto-Scroll
  useEffect(() => {
    if (allMatchesSorted.length > 0 && listRef.current) {
        
        // PRIORIDAD 1: Si acabamos de crear un partido, ir al final de la lista
        if (shouldScrollToBottomRef.current) {
             setTimeout(() => {
                if (listRef.current) {
                    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
                }
                shouldScrollToBottomRef.current = false; // Reset flag
            }, 300);
            return;
        }

        // PRIORIDAD 2: Comportamiento por defecto (Primer pendiente), solo si NO hay filtro
        if (!filterTeamId) {
            // Buscar el primer partido que NO tenga resultado (pendiente)
            const firstPending = allMatchesSorted.find(m => {
                const hasResult = m.puntos_local !== null && m.puntos_local !== undefined;
                if (!hasResult) return true;
                return false;
            });

            // Si encontramos uno pendiente, hacemos scroll hacia él
            const targetId = firstPending ? firstPending.id : allMatchesSorted[allMatchesSorted.length - 1].id;
            
            setTimeout(() => {
                const element = document.getElementById(`admin-match-${targetId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }
  }, [matches, filterTeamId]); 

  const handleEditClick = (match: Partido) => {
    setEditingId(match.id);
    setJornada(match.jornada || 1);
    
    if (match.fecha_hora) {
        const dateObj = new Date(match.fecha_hora);
        setFecha(dateObj.toISOString().split('T')[0]);
        // Formato HH:MM
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        setHora(`${hours}:${minutes}`);
    } else {
        setFecha('');
        setHora('12:00');
    }

    setLocalId(String(match.equipo_local_id));
    setVisitorId(String(match.equipo_visitante_id));
    setMessage(null);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setJornada(1);
    setFecha('');
    setHora('12:00');
    setLocalId('');
    setVisitorId('');
    setMessage(null);
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar este partido?")) return;

    setIsSubmitting(true);
    try {
        await deleteMatch(editingId);
        setMessage({ type: 'success', text: 'Partido eliminado correctamente.' });
        
        // Reset and refresh
        setEditingId(null);
        setLocalId('');
        setVisitorId('');
        setFecha('');
        
        onMatchAdded(); // Refresh parent data
    } catch (error: any) {
        console.error(error);
        setMessage({ type: 'error', text: 'Error al eliminar el partido: ' + error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!localId || !visitorId || !fecha || !hora) {
        setMessage({ type: 'error', text: 'Por favor completa todos los campos.' });
        return;
    }

    if (localId === visitorId) {
        setMessage({ type: 'error', text: 'El equipo local y visitante no pueden ser el mismo.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const fechaHora = new Date(`${fecha}T${hora}`).toISOString();
        const payload = {
            jornada: Number(jornada),
            equipo_local_id: localId,
            equipo_visitante_id: visitorId,
            fecha_hora: fechaHora
        };

        if (editingId) {
            // Logic to determine if updating 'calendario' (cal_) or 'partidos'
            const isCalendar = String(editingId).startsWith('cal_');
            
            if (isCalendar) {
                const realId = String(editingId).replace('cal_', '');
                await updateCalendarioEntry(realId, payload);
            } else {
                await updatePartidoEntry(editingId, {
                    ...payload,
                    // Cannot update comp id easily here without more payload, assuming same comp
                });
            }
            setMessage({ type: 'success', text: 'Partido actualizado correctamente.' });
            setEditingId(null);
        } else {
            // CREATION MODE
            await createCalendarioEntry({
                competicion_id: competicionId,
                ...payload
            });
            setMessage({ type: 'success', text: 'Partido añadido correctamente al calendario.' });
            // Set flag to scroll to bottom on next render
            shouldScrollToBottomRef.current = true;
        }

        // Reset fields partially to allow quick entry of same jornada if not editing
        if (!editingId) {
            setLocalId('');
            setVisitorId('');
        } else {
            setLocalId('');
            setVisitorId('');
            setFecha('');
        }
        
        onMatchAdded(); // Refresh parent data
    } catch (error: any) {
        console.error(error);
        setMessage({ type: 'error', text: 'Error al guardar el partido: ' + error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario (Columna Izquierda ancha) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden animate-fade-in order-1 lg:order-1 h-fit">
        <div className={`p-4 flex items-center justify-between ${editingId ? 'bg-orange-500' : 'bg-fcbq-blue'}`}>
            <div className="flex items-center gap-2 text-white">
                {editingId ? <Pencil size={24} /> : <Calendar size={24} />}
                <h2 className="text-xl font-bold">{editingId ? 'Editar Partido' : 'Cargar Calendario'}</h2>
            </div>
            {editingId && (
                <button onClick={cancelEdit} className="text-white hover:bg-white/20 p-1 rounded">
                    <X size={20} />
                </button>
            )}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
            
            {/* Jornada y Fecha */}
            <div className="flex flex-col md:flex-row gap-6 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Jornada</label>
                    <div className="flex items-center shadow-sm rounded-lg overflow-hidden border border-gray-200">
                        <button 
                            type="button" 
                            onClick={() => setJornada(Math.max(1, jornada - 1))}
                            className="bg-white border-r border-gray-200 p-3 hover:bg-gray-50 text-slate-600 transition-colors font-bold"
                        >-</button>
                        <input 
                            type="number" 
                            value={jornada} 
                            onChange={(e) => setJornada(parseInt(e.target.value) || 1)}
                            className="w-full text-center py-3 font-bold text-lg bg-white text-slate-800 outline-none"
                        />
                        <button 
                            type="button" 
                            onClick={() => setJornada(jornada + 1)}
                            className="bg-white border-l border-gray-200 p-3 hover:bg-gray-50 text-slate-600 transition-colors font-bold"
                        >+</button>
                    </div>
                </div>
                
                <div className="w-full md:w-1/2">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Fecha</label>
                    <div className="relative shadow-sm rounded-lg border border-gray-200 overflow-hidden bg-white">
                        <input 
                            type="date" 
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full p-3 border-none focus:ring-2 focus:ring-fcbq-blue outline-none bg-white text-slate-800 font-medium"
                        />
                        <Calendar className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={18} />
                    </div>
                </div>

                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Hora</label>
                    <div className="relative shadow-sm rounded-lg border border-gray-200 overflow-hidden bg-white">
                        <input 
                            type="time" 
                            value={hora}
                            onChange={(e) => setHora(e.target.value)}
                            className="w-full p-3 border-none focus:ring-2 focus:ring-fcbq-blue outline-none bg-white text-slate-800 font-medium"
                        />
                        <Clock className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={18} />
                    </div>
                </div>
            </div>

            {/* Selección de Equipos (Visual) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                
                {/* Local */}
                <div className="flex-1 w-full bg-blue-50/50 p-6 rounded-xl border border-blue-100 flex flex-col items-center relative group hover:shadow-md transition-all">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">Equipo Local</span>
                    
                    <div className="w-32 h-32 bg-white rounded-full p-4 border-4 border-white shadow-md mb-4 flex items-center justify-center overflow-hidden">
                        {localTeam?.clubs?.logo_url ? (
                            <img src={localTeam.clubs.logo_url} alt="Local" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-4xl font-bold text-slate-200">?</span>
                        )}
                    </div>

                    <select 
                        value={localId}
                        onChange={(e) => setLocalId(e.target.value)}
                        className="w-full p-3 bg-white border border-blue-200 rounded-lg font-bold text-slate-800 text-center focus:ring-2 focus:ring-blue-400 outline-none shadow-sm cursor-pointer"
                    >
                        <option value="">Seleccionar Local...</option>
                        {sortedEquipos.map(eq => (
                            <option key={eq.id} value={eq.id} disabled={String(eq.id) === visitorId}>
                                {eq.nombre_especifico}
                            </option>
                        ))}
                    </select>
                </div>

                {/* VS Divider */}
                <div className="flex flex-col items-center justify-center shrink-0">
                    <span className="text-5xl font-black text-slate-200 italic">VS</span>
                </div>

                {/* Visitante */}
                <div className="flex-1 w-full bg-red-50/50 p-6 rounded-xl border border-red-100 flex flex-col items-center relative group hover:shadow-md transition-all">
                    <span className="text-xs font-black text-red-400 uppercase tracking-widest mb-3">Equipo Visitante</span>
                    
                    <div className="w-32 h-32 bg-white rounded-full p-4 border-4 border-white shadow-md mb-4 flex items-center justify-center overflow-hidden">
                        {visitorTeam?.clubs?.logo_url ? (
                            <img src={visitorTeam.clubs.logo_url} alt="Visitante" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-4xl font-bold text-slate-200">?</span>
                        )}
                    </div>

                    <select 
                        value={visitorId}
                        onChange={(e) => setVisitorId(e.target.value)}
                        className="w-full p-3 bg-white border border-red-200 rounded-lg font-bold text-slate-800 text-center focus:ring-2 focus:ring-red-400 outline-none shadow-sm cursor-pointer"
                    >
                        <option value="">Seleccionar Visitante...</option>
                        {sortedEquipos.map(eq => (
                            <option key={eq.id} value={eq.id} disabled={String(eq.id) === localId}>
                                {eq.nombre_especifico}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Feedback Messages */}
            {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                    {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
                {editingId && (
                    <button 
                        type="button"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="px-4 py-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors flex items-center justify-center"
                        title="Borrar partido"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
                
                {editingId && (
                    <button 
                        type="button"
                        onClick={cancelEdit}
                        className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                )}
                
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`flex-1 py-4 rounded-xl font-bold text-lg text-white shadow-md flex items-center justify-center gap-3 transition-all ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-fcbq-blue hover:bg-blue-700 hover:shadow-lg active:scale-[0.99]'}`}
                >
                    {isSubmitting ? 'Guardando...' : editingId ? <><Save size={20} /> Actualizar Partido</> : <><Plus size={20} /> Crear Partido</>}
                </button>
            </div>

        </form>
        </div>

        {/* Lista de Partidos Completa (Columna Derecha) */}
        <div className="lg:col-span-1 flex flex-col h-[600px] lg:h-[640px] bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden order-2 lg:order-2">
            <div className="bg-slate-50 p-4 border-b border-slate-100 shrink-0 z-10 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">Calendario Completo</h3>
                    <div className="bg-white p-1 rounded border border-slate-200">
                        <Filter size={14} className="text-slate-400" />
                    </div>
                </div>
                
                <select 
                    value={filterTeamId}
                    onChange={(e) => setFilterTeamId(e.target.value)}
                    className="w-full text-xs font-bold p-2 rounded border border-slate-200 bg-white text-slate-600 focus:ring-2 focus:ring-fcbq-blue outline-none"
                >
                    <option value="">TODOS LOS EQUIPOS</option>
                    {sortedEquipos.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre_especifico}</option>
                    ))}
                </select>

                <button 
                    onClick={() => setShowPlayedMatches(!showPlayedMatches)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all border ${showPlayedMatches ? 'bg-fcbq-blue text-white border-fcbq-blue' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                    {showPlayedMatches ? <Eye size={12} /> : <EyeOff size={12} />}
                    {showPlayedMatches ? 'Ocultar Partidos Jugados' : 'Ver Partidos Jugados'}
                </button>

                <p className="text-[10px] text-slate-400 text-center">
                    {filteredMatches.length} partidos encontrados
                </p>
            </div>
            
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/30">
                {filteredMatches.length === 0 && (
                    <p className="text-center text-slate-400 py-8 text-sm italic">
                        {filterTeamId ? 'No hay partidos para este equipo.' : 'No hay partidos pendientes.'}
                    </p>
                )}
                {filteredMatches.map(m => {
                    const isPlayed = m.puntos_local !== null && m.puntos_local !== undefined;
                    return (
                        <button 
                            key={m.id}
                            id={`admin-match-${m.id}`}
                            onClick={() => handleEditClick(m)}
                            className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 ${editingId === m.id ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-200' : isPlayed ? 'bg-slate-100 border-slate-200 opacity-70 hover:opacity-100' : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 shadow-sm'}`}
                        >
                            <div className="flex justify-between items-center w-full">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${editingId === m.id ? 'bg-orange-100 text-orange-600' : isPlayed ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-fcbq-blue'}`}>
                                    JORNADA {m.jornada}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400">
                                    {m.fecha_hora ? new Date(m.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`flex-1 text-xs font-bold truncate ${isPlayed ? 'text-slate-500' : 'text-slate-700'}`}>{m.equipo_local?.nombre_especifico}</div>
                                {isPlayed ? (
                                    <div className="bg-white px-2 py-0.5 rounded border text-[10px] font-bold text-slate-600">{m.puntos_local}-{m.puntos_visitante}</div>
                                ) : (
                                    <div className="text-[10px] font-black text-slate-300">VS</div>
                                )}
                                <div className={`flex-1 text-xs font-bold truncate text-right ${isPlayed ? 'text-slate-500' : 'text-slate-700'}`}>{m.equipo_visitante?.nombre_especifico}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default CalendarAdmin;
