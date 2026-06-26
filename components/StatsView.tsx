
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Standings from './Standings';
import TeamStats from './TeamStats';
import { fetchTeamStats } from '../services/dataService';
import { Loader2 } from 'lucide-react';
import { Competicion } from '../types';

interface StatsViewProps {
  viewData: {
    matches: any[],
    realMatches: any[],
    equipos: any[],
    competicion: Competicion | null
  };
  selectedCompeticionId: string;
}

const StatsView: React.FC<StatsViewProps> = ({ viewData, selectedCompeticionId }) => {
  const navigate = useNavigate();
  const initialCompetitionId = String(viewData?.competicion?.id || selectedCompeticionId || '');

  const [selectedTeamId, setSelectedTeamId] = useState<number | string | null>(() => {
    if (!initialCompetitionId) return null;
    return sessionStorage.getItem(`stats:selectedTeam:${initialCompetitionId}`);
  });
  const [teamDetails, setTeamDetails] = useState<{
    matches: any[],
    plantilla: any[],
    allPlantillas?: any[],
    stats: any[],
    movements: any[]
  } | null>(() => {
    if (!initialCompetitionId) return null;

    const raw = sessionStorage.getItem(`stats:teamDetails:${initialCompetitionId}`);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(`stats:teamDetails:${initialCompetitionId}`);
      return null;
    }
  });
  const [loadingTeam, setLoadingTeam] = useState(false);
  const previousCompetitionIdRef = useRef<string>(String(viewData?.competicion?.id || selectedCompeticionId || ''));

  // Clear team details only when the selected competition really changes.
  useEffect(() => {
    const currentCompetitionId = String(viewData?.competicion?.id || selectedCompeticionId || '');
    const previousCompetitionId = previousCompetitionIdRef.current;

    if (!previousCompetitionId) {
      previousCompetitionIdRef.current = currentCompetitionId;
      return;
    }

    if (previousCompetitionId !== currentCompetitionId) {
      setSelectedTeamId(null);
      setTeamDetails(null);
      setLoadingTeam(false);
      sessionStorage.removeItem(`stats:selectedTeam:${previousCompetitionId}`);
      sessionStorage.removeItem(`stats:teamDetails:${previousCompetitionId}`);
    }

    previousCompetitionIdRef.current = currentCompetitionId;
  }, [selectedCompeticionId, viewData?.competicion?.id]);

  // --- Team Selection Action ---
  const handleTeamSelect = async (teamId: number | string) => {
    if (teamId === selectedTeamId) return;
    setSelectedTeamId(teamId);
    const compId = viewData?.competicion?.id || selectedCompeticionId;
    if (compId) {
      sessionStorage.setItem(`stats:selectedTeam:${String(compId)}`, String(teamId));
    }
    setLoadingTeam(true);
    try {
        const details = await fetchTeamStats(compId, teamId);
        setTeamDetails(details);
        if (compId) {
          sessionStorage.setItem(`stats:teamDetails:${String(compId)}`, JSON.stringify(details));
        }
        // Scroll to details logic
        setTimeout(() => {
            document.getElementById('team-details')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingTeam(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      {/* Compact Clasificación Section */}
      <section className="mb-lg">
          {viewData.equipos.length > 0 ? (
              <Standings 
                  equipos={viewData.equipos} 
                  partidos={viewData.realMatches}
                  esMini={viewData.competicion?.categorias?.es_mini || false}
                  onSelectTeam={handleTeamSelect}
                  selectedTeamId={selectedTeamId}
              />
          ) : (
              <div className="p-8 text-center text-outline bg-surface-container-lowest border border-outline-variant rounded-xl text-sm italic">
                  No hay equipos registrados en esta competición.
              </div>
          )}
          <p className="text-[10px] text-outline mt-2 italic font-medium">
            * Selecciona un equipo para cargar estadísticas avanzadas y listado de partidos.
          </p>
      </section>

      {selectedTeamId && (
          <section id="team-details" className="scroll-mt-24 space-y-md">
               {/* Selected Team Details Header */}
               <div className="flex items-start justify-between mb-sm border-b border-outline-variant/30 pb-3">
                   <div>
                      <h1 className="text-headline-lg-mobile font-bold text-primary tracking-tight leading-tight uppercase">
                         {viewData.equipos.find(e => e.id === selectedTeamId)?.nombre_especifico || 'Equipo Seleccionado'}
                      </h1>
                      <p className="text-body-md font-medium text-outline flex items-center gap-xs mt-0.5">
                         Temporada 2025/26 <span className="w-1 h-1 bg-outline-variant rounded-full"></span> Estadísticas
                      </p>
                   </div>
                   {loadingTeam && (
                     <div className="flex items-center justify-center p-2 bg-primary/5 rounded-full shrink-0 animate-spin">
                       <Loader2 className="text-primary" size={20} />
                     </div>
                   )}
               </div>

               {teamDetails ? (
                   <TeamStats 
                      equipoId={selectedTeamId}
                      matches={teamDetails.matches}
                      plantilla={teamDetails.plantilla}
                       allPlantillas={teamDetails.allPlantillas}
                      stats={teamDetails.stats}
                      movements={teamDetails.movements}
                      esMini={viewData.competicion?.categorias?.es_mini || false}
                   />
               ) : (
                  !loadingTeam && (
                    <div className="p-8 text-center text-outline bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl text-sm italic">
                      Cargando detalles del equipo...
                    </div>
                  )
               )}
          </section>
      )}
    </div>
  );
};

export default StatsView;
