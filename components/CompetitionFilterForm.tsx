import React, { useMemo } from 'react';
import { ChevronDown, Loader2, Search } from 'lucide-react';
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 items-end">
        <div className="lg:col-span-2">
          <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Temporada</label>
          <div className="relative">
            <select
              value={selectedTemporada}
              onChange={(e) => onTemporadaChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-gray-700 text-base md:text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium transition-colors hover:bg-slate-100 cursor-pointer"
            >
              <option value="" disabled className="text-base">SELECCIONAR...</option>
              {temporadas.map((temporada) => (
                <option key={temporada.id} value={temporada.id} className="text-base">
                  {temporada.nombre}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="lg:col-span-3">
          <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Categoría</label>
          <div className="relative">
            <select
              value={selectedCategoria}
              onChange={(e) => onCategoriaChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-gray-700 text-base md:text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium transition-colors hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedTemporada}
            >
              <option value="" disabled className="text-base">SELECCIONAR CATEGORÍA</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id} className="text-base">
                  {categoria.nombre}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="lg:col-span-3">
          <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Fase</label>
          <div className="relative">
            <select
              value={selectedFase}
              onChange={(e) => onFaseChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-gray-700 text-base md:text-sm rounded-lg focus:ring-fcbq-blue focus:border-fcbq-blue block w-full p-2.5 appearance-none shadow-sm font-medium transition-colors hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedCategoria}
            >
              <option value="" className="text-base">TODAS LAS FASES</option>
              <option value="Primera Fase" className="text-base">PRIMERA FASE</option>
              <option value="Segona Fase" className="text-base">SEGONA FASE</option>
              <option value="Tercera Fase" className="text-base">TERCERA FASE</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="lg:col-span-4">
          <label className="block mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">Competición</label>
          <div className="relative">
            <select
              value={selectedCompeticion}
              onChange={(e) => onCompeticionChange(e.target.value)}
              className={`border text-base md:text-sm rounded-lg block w-full p-2.5 appearance-none shadow-sm font-bold transition-all cursor-pointer ${selectedCompeticion ? 'bg-fcbq-blue text-white border-fcbq-blue' : 'bg-slate-50 border-slate-200 text-gray-700 hover:bg-slate-100'} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-gray-400`}
              disabled={loadingCompetitions || !selectedTemporada || !selectedCategoria}
            >
              <option value="" disabled className="text-base text-gray-500 bg-white">
                {loadingCompetitions ? 'CARGANDO...' : (!selectedTemporada || !selectedCategoria ? 'SELECCIONA FILTROS PREVIOS' : 'SELECCIONAR COMPETICIÓN')}
              </option>
              {!loadingCompetitions && filteredCompeticiones.length === 0 && selectedCategoria && (
                <option value="" disabled className="text-base bg-white text-gray-800">SIN RESULTADOS</option>
              )}
              {filteredCompeticiones.map((competicion) => (
                <option key={competicion.id} value={competicion.id} className="text-base bg-white text-gray-800">
                  {competicion.nombre}
                </option>
              ))}
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

      {onSubmit && (
        <div className="flex justify-end">
          <button
            onClick={onSubmit}
            disabled={submitDisabled}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-fcbq-blue text-white font-bold shadow-sm hover:bg-fcbq-dark transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Search size={18} />
            {submitLabel || 'Continuar'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CompetitionFilterForm;