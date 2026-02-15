
import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, Filter, Trophy, Calendar, Layers } from 'lucide-react';
import { Temporada, Categoria, Competicion } from '../types';

interface CompetitionFiltersProps {
    temporadas: Temporada[];
    categorias: Categoria[];
    competiciones: Competicion[];
    loadingCompetitions: boolean;
    selectedTemporada: string;
    selectedCategoria: string;
    selectedFase: string;
    selectedCompeticion: string;
    onTemporadaChange: (val: string) => void;
    onCategoriaChange: (val: string) => void;
    onFaseChange: (val: string) => void;
    onCompeticionChange: (val: string) => void;
    isScrolled: boolean;
}

const CompetitionFilters: React.FC<CompetitionFiltersProps> = ({
    temporadas,
    categorias,
    competiciones,
    loadingCompetitions,
    selectedTemporada,
    selectedCategoria,
    selectedFase,
    selectedCompeticion,
    onTemporadaChange,
    onCategoriaChange,
    onFaseChange,
    onCompeticionChange,
    isScrolled
}) => {
    // Estado para controlar si los filtros están visibles o colapsados
    const [isExpanded, setIsExpanded] = useState(true);

    // Auto-colapsar cuando se selecciona una competición válida
    useEffect(() => {
        if (selectedCompeticion) {
            setIsExpanded(false);
        } else {
            setIsExpanded(true);
        }
    }, [selectedCompeticion]);

    // --- Derived Data for Display ---
    const filteredCompeticiones = useMemo(() => {
        if (!selectedFase) return competiciones;
        return competiciones.filter(c =>
            c.nombre.toLowerCase().includes(selectedFase.toLowerCase())
        );
    }, [competiciones, selectedFase]);

    // Obtener nombres para el modo colapsado
    const currentTempName = temporadas.find(t => t.id.toString() === selectedTemporada)?.nombre;
    const currentCatName = categorias.find(c => c.id.toString() === selectedCategoria)?.nombre;
    const currentCompName = competiciones.find(c => c.id.toString() === selectedCompeticion)?.nombre;

    // Ajuste dinámico de la posición sticky para evitar huecos con la cabecera al hacer scroll
    // Header Extendido (~72px) | Header Comprimido (~52px)
    const stickyTopClass = isScrolled 
        ? 'top-[48px] md:top-[52px]' 
        : 'top-[72px] md:top-[72px]';

    return (
        <div className={`bg-white shadow-sm transition-all duration-300 ease-in-out z-30 relative ${isExpanded ? 'border-b border-gray-200 py-6' : `py-0 border-b border-gray-100 sticky ${stickyTopClass}`}`}>
            
            {/* --- MODO COLAPSADO (HEADER COMPACTO) --- */}
            {!isExpanded && selectedCompeticion && (
                <div className="container mx-auto px-4 py-3 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Título y Breadcrumbs */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                <span className="flex items-center gap-1"><Calendar size={10} /> {currentTempName}</span>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1"><Layers size={10} /> {currentCatName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-1.5 bg-fcbq-accent rounded-full shrink-0"></div>
                                <h2 className="text-lg md:text-2xl font-black text-slate-800 truncate leading-tight">
                                    {currentCompName}
                                </h2>
                            </div>
                        </div>

                        {/* Botón para abrir filtros */}
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase transition-colors shrink-0"
                        >
                            <Filter size={14} />
                            <span className="hidden md:inline">Cambiar Competición</span>
                            <span className="md:hidden">Filtros</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODO EXPANDIDO (FORMULARIO) --- */}
            {isExpanded && (
                <div className="container mx-auto px-4 animate-fade-in">
                    
                    {/* Header del formulario (solo si ya hay algo seleccionado, para poder cerrar) */}
                    {selectedCompeticion && (
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Filter size={14} /> Buscador de Competiciones
                            </h3>
                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs font-bold uppercase"
                            >
                                Cerrar <ChevronUp size={14} />
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 items-end">
                        {/* Temporada */}
                        <div className="lg:col-span-2">
                            <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Temporada</label>
                            <div className="relative">
                                <select
                                    value={selectedTemporada}
                                    onChange={(e) => onTemporadaChange(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-gray-700 text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium transition-colors hover:bg-slate-100 cursor-pointer"
                                >
                                    <option value="" disabled>SELECCIONAR...</option>
                                    {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Categoría */}
                        <div className="lg:col-span-3">
                            <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Categoría</label>
                            <div className="relative">
                                <select
                                    value={selectedCategoria}
                                    onChange={(e) => onCategoriaChange(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-gray-700 text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium transition-colors hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!selectedTemporada}
                                >
                                    <option value="" disabled>SELECCIONAR CATEGORÍA</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Fase */}
                        <div className="lg:col-span-3">
                            <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Fase</label>
                            <div className="relative">
                                <select
                                    value={selectedFase}
                                    onChange={(e) => onFaseChange(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-gray-700 text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium transition-colors hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!selectedCategoria}
                                >
                                    <option value="">TODAS LAS FASES</option>
                                    <option value="Primera Fase">PRIMERA FASE</option>
                                    <option value="Segona Fase">SEGONA FASE</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Competición */}
                        <div className="lg:col-span-4">
                            <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Competición</label>
                            <div className="relative">
                                <select
                                    value={selectedCompeticion}
                                    onChange={(e) => onCompeticionChange(e.target.value)}
                                    className={`border text-sm rounded-lg block w-full p-2.5 appearance-none shadow-sm font-bold transition-all cursor-pointer ${selectedCompeticion ? 'bg-fcbq-blue text-white border-fcbq-blue' : 'bg-slate-50 border-slate-200 text-gray-700 hover:bg-slate-100'} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-gray-400`}
                                    disabled={loadingCompetitions || !selectedTemporada || !selectedCategoria}
                                >
                                    <option value="" disabled className="text-gray-500 bg-white">
                                        {loadingCompetitions ? 'CARGANDO...' : (!selectedTemporada || !selectedCategoria ? 'SELECCIONA FILTROS PREVIOS' : 'SELECCIONAR COMPETICIÓN')}
                                    </option>
                                    {!loadingCompetitions && filteredCompeticiones.length === 0 && selectedCategoria && <option value="" disabled className="bg-white text-gray-800">SIN RESULTADOS</option>}
                                    {filteredCompeticiones.map(c => <option key={c.id} value={c.id} className="bg-white text-gray-800">{c.nombre}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                    {loadingCompetitions ? (
                                        <Loader2 size={16} className="animate-spin text-gray-400" />
                                    ) : (
                                        <ChevronDown className={`${selectedCompeticion ? 'text-white' : 'text-gray-400'}`} size={16} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompetitionFilters;
