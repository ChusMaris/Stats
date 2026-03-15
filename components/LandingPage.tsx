import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock3, Users } from 'lucide-react';
import { Categoria, Competicion, RecentCompetition, Temporada } from '../types';
import CompetitionFilterForm from './CompetitionFilterForm';

interface LandingPageProps {
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
  recentSearches: RecentCompetition[];
  onOpenRecent: (item: RecentCompetition) => void;
  hasActiveCompetition: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({
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
  recentSearches,
  onOpenRecent,
  hasActiveCompetition,
}) => {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;

    carouselRef.current.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-5 md:space-y-7 animate-fade-in">
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
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
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock3 size={18} className="text-fcbq-blue" />
              Últimas búsquedas
            </h3>
            <p className="text-sm text-slate-500 mt-1">Hasta 5 combinaciones recientes para retomar una competición más rápido.</p>
          </div>

          {recentSearches.length > 1 && (
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button
                onClick={() => scrollCarousel('left')}
                className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-fcbq-blue hover:border-fcbq-blue transition-colors"
                aria-label="Desplazar historial a la izquierda"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-fcbq-blue hover:border-fcbq-blue transition-colors"
                aria-label="Desplazar historial a la derecha"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {recentSearches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-500">
            Tu historial aparecerá aquí cuando abras una competición desde el buscador o cambies de competición dentro de la app.
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1"
          >
            {recentSearches.map((item) => (
              <button
                key={`${item.temporadaId}-${item.categoriaId}-${item.fase || 'all'}-${item.id}`}
                onClick={() => onOpenRecent(item)}
                className="snap-start shrink-0 w-[270px] sm:w-[300px] rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-fcbq-blue shadow-sm transition-all text-left p-4"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-fcbq-blue">Reciente</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
                <h4 className="text-base font-bold text-slate-900 leading-tight">{item.nombre}</h4>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>{item.temporadaNombre}</p>
                  <p>{item.categoriaNombre}</p>
                  <p>{item.fase || 'Todas las fases'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-fcbq-blue" />
              Buscador de jugadores
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Dejamos lista la navegación a la futura página de jugadores para integrarla en la arquitectura desde ahora.
            </p>
          </div>

          <Link
            to="/players"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
          >
            Ir a jugadores
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;