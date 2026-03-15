import React from 'react';
import { Search, Users } from 'lucide-react';

interface PlayersPageProps {
  activeCompetitionName?: string;
}

const PlayersPage: React.FC<PlayersPageProps> = ({ activeCompetitionName }) => {
  return (
    <div className="animate-fade-in space-y-6">
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-fcbq-blue text-white px-5 py-6 md:px-8 md:py-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100 mb-2">Próxima fase</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Buscador de jugadores</h2>
          <p className="text-sm md:text-base text-blue-100 mt-3 max-w-2xl">
            Esta ruta ya queda visible en la navegación para preparar el futuro listado transversal de jugadores.
          </p>
        </div>

        <div className="p-5 md:p-8 bg-slate-50 space-y-4">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 md:p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-fcbq-blue mb-4">
              <Users size={26} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Página en preparación</h3>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto">
              Más adelante construiremos un listado de jugadores con su propia lógica de búsqueda, filtros y navegación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Objetivo previsto</p>
              <p className="text-slate-800 font-semibold mt-2 flex items-center gap-2">
                <Search size={16} className="text-fcbq-blue" />
                Buscar jugadores más allá de una sola competición
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Contexto actual</p>
              <p className="text-slate-800 font-semibold mt-2">
                {activeCompetitionName ? `Competición activa: ${activeCompetitionName}` : 'Sin competición activa seleccionada'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PlayersPage;