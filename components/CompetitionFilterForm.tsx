import React, { useMemo } from 'react';
import { ChevronDown, Loader2, Search, Lock } from 'lucide-react';
import { Temporada, Categoria, Competicion } from '../types';

interface CompetitionFilterFormProps {
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
  submitLabel?: string;
  onSubmit?: () => void;
  submitDisabled?: boolean;
}

const CompetitionFilterForm: React.FC<CompetitionFilterFormProps> = ({
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
  submitLabel,
  onSubmit,
  submitDisabled,
}) => {
  const filteredCompeticiones = useMemo(() => {
    if (!selectedFase) return competiciones;

    return competiciones.filter((competicion) =>
      competicion.nombre.toLowerCase().includes(selectedFase.toLowerCase())
    );
  }, [competiciones, selectedFase]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {/* Temporada */}
        <div className="space-y-base text-left">
          <label className="text-[10px] font-bold text-outline uppercase block">Temporada</label>
          <div className="relative group">
            <select
              value={selectedTemporada}
              onChange={(e) => onTemporadaChange(e.target.value)}
              className="w-full h-10 bg-surface-container-low border border-outline-variant rounded px-2 text-data-tabular outline-none focus:border-primary transition-colors appearance-none cursor-pointer text-slate-800"
            >
              <option value="" disabled className="text-xs text-slate-500">SELECCIONAR...</option>
              {temporadas.map((temporada) => (
                <option key={temporada.id} value={temporada.id} className="text-xs text-slate-800">
                  {temporada.nombre}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-lg">expand_more</span>
          </div>
        </div>

        {/* Categoría */}
        <div className="space-y-base text-left">
          <label className="text-[10px] font-bold text-outline uppercase block">Categoría</label>
          <div className="relative">
            <select
              value={selectedCategoria}
              onChange={(e) => onCategoriaChange(e.target.value)}
              className="w-full h-10 bg-surface-container-low border border-outline-variant rounded px-2 text-data-tabular outline-none focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-slate-800"
              disabled={!selectedTemporada}
            >
              <option value="" disabled className="text-xs text-slate-500">SELECCIONAR CATEGORÍA</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id} className="text-xs text-slate-800">
                  {categoria.nombre}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-lg">expand_more</span>
          </div>
        </div>

        {/* Fase */}
        <div className="space-y-base text-left">
          <label className="text-[10px] font-bold text-outline uppercase block">Fase</label>
          <div className="relative">
            <select
              value={selectedFase}
              onChange={(e) => onFaseChange(e.target.value)}
              className="w-full h-10 bg-surface-container-low border border-outline-variant rounded px-2 text-data-tabular outline-none focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-slate-800"
              disabled={!selectedCategoria}
            >
              <option value="" className="text-xs text-slate-800">TODAS LAS FASES</option>
              <option value="Primera Fase" className="text-xs text-slate-800">Primera Fase</option>
              <option value="Segona Fase" className="text-xs text-slate-800">Segona Fase</option>
              <option value="Tercera Fase" className="text-xs text-slate-800">Tercera Fase</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-lg">expand_more</span>
          </div>
        </div>

        {/* Competición */}
        <div className="space-y-base text-left">
          <label className="text-[10px] font-bold text-outline uppercase block">Competición</label>
          <div className="relative">
            <select
              value={selectedCompeticion}
              onChange={(e) => onCompeticionChange(e.target.value)}
              className={`w-full h-10 appearance-none px-2 text-data-tabular font-bold outline-none rounded border transition-all ${
                selectedCompeticion 
                  ? 'bg-primary text-white border-primary cursor-pointer' 
                  : 'bg-surface-container-low border border-outline-variant focus:border-primary text-slate-800 cursor-pointer'
              } disabled:bg-surface-container-low/50 disabled:border-outline-variant/40 disabled:text-on-surface-variant/60 disabled:cursor-not-allowed`}
              disabled={loadingCompetitions || !selectedTemporada || !selectedCategoria}
            >
              <option value="" disabled className="text-xs text-slate-500 bg-white">
                {loadingCompetitions ? 'CARGANDO...' : (!selectedTemporada || !selectedCategoria ? 'SELECCIONA FILTROS' : 'SELECCIONAR COMPETICIÓN')}
              </option>
              {!loadingCompetitions && filteredCompeticiones.length === 0 && selectedCategoria && (
                <option value="" disabled className="text-xs bg-white text-slate-800">SIN RESULTADOS</option>
              )}
              {filteredCompeticiones.map((competicion) => (
                <option key={competicion.id} value={competicion.id} className="text-xs bg-white text-slate-800">
                  {competicion.nombre}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
              {loadingCompetitions ? (
                <Loader2 size={14} className="animate-spin text-slate-400" />
              ) : (!selectedTemporada || !selectedCategoria) ? (
                <span className="material-symbols-outlined text-lg text-outline-variant">lock</span>
              ) : (
                <span className={`material-symbols-outlined text-lg ${selectedCompeticion ? 'text-white' : 'text-outline'}`}>expand_more</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {onSubmit && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onSubmit}
            disabled={submitDisabled}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-primary text-white font-label-sm text-label-sm shadow-md hover:bg-primary-container active:scale-95 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Search size={16} />
            {submitLabel || 'Continuar'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CompetitionFilterForm;