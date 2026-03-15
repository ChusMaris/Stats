
import React from 'react';
import { ChevronUp, Filter, Layers } from 'lucide-react';
import { Temporada, Categoria, Competicion } from '../types';
import CompetitionFilterForm from './CompetitionFilterForm';

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
    // New Props for Controlled State
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
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
    isScrolled,
    isExpanded,
    setIsExpanded
}) => {

    // Obtener nombres para el modo colapsado
    const currentCatName = categorias.find(c => c.id.toString() === selectedCategoria)?.nombre;
    const currentCompName = competiciones.find(c => c.id.toString() === selectedCompeticion)?.nombre;
    const collapsedContainerPadding = 'py-1.5';

    // No 'sticky' logic here anymore. This component just renders content.
    // The sticky behavior is handled by the parent wrapper in App.tsx.

    return (
        <div className={`bg-white transition-all duration-300 ease-in-out relative ${isExpanded ? 'border-b border-gray-200 py-4 md:py-6' : `border-b border-gray-100 ${collapsedContainerPadding}`}`}>
            
            {/* --- MODO COLAPSADO (HEADER COMPACTO) --- */}
            {!isExpanded && selectedCompeticion && (
                <div className="container mx-auto px-4 animate-fade-in">
                    <div className="flex flex-row items-center justify-between gap-2 md:gap-3">
                        {/* Contexto compacto en una sola línea */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 md:gap-2 overflow-hidden">
                            {currentCatName && (
                                <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] md:text-[10px] font-bold uppercase tracking-wide max-w-[120px] md:max-w-[220px] truncate shrink-0">
                                    <Layers size={9} />
                                    {currentCatName}
                                </span>
                            )}
                            <h2 className="font-black text-slate-800 truncate leading-tight text-sm md:text-lg">
                                {currentCompName}
                            </h2>
                        </div>

                        {/* Botón para abrir filtros */}
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="flex items-center justify-center gap-1 md:gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold uppercase transition-all shrink-0 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px]"
                        >
                            <Filter size={12} />
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

                    <CompetitionFilterForm
                        temporadas={temporadas}
                        categorias={categorias}
                        competiciones={competiciones}
                        loadingCompetitions={loadingCompetitions}
                        selectedTemporada={selectedTemporada}
                        selectedCategoria={selectedCategoria}
                        selectedFase={selectedFase}
                        selectedCompeticion={selectedCompeticion}
                        onTemporadaChange={onTemporadaChange}
                        onCategoriaChange={onCategoriaChange}
                        onFaseChange={onFaseChange}
                        onCompeticionChange={onCompeticionChange}
                    />
                </div>
            )}
        </div>
    );
};

export default CompetitionFilters;
