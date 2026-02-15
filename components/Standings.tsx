
import React, { useMemo } from 'react';
import { Equipo, TeamStanding } from '../types';

interface StandingsProps {
  equipos: Equipo[];
  partidos: any[];
  esMini: boolean;
  onSelectTeam: (teamId: number | string) => void;
  selectedTeamId: number | string | null;
}

const Standings: React.FC<StandingsProps> = ({ equipos, partidos, esMini, onSelectTeam, selectedTeamId }) => {

  const standings = useMemo(() => {
    try {
      if (!equipos || !Array.isArray(equipos) || !partidos || !Array.isArray(partidos)) return [];
      
      const map = new Map<number | string, TeamStanding>();

      // 1. Inicializar mapa de equipos
      equipos.forEach(eq => {
        if (eq && eq.id) {
          map.set(eq.id, {
            equipoId: eq.id,
            nombre: eq.nombre_especifico || 'Equipo',
            clubLogo: eq.clubs?.logo_url,
            pj: 0,
            pg: 0,
            pp: 0,
            pf: 0,
            pc: 0,
            diff: 0,
            puntos: 0
          });
        }
      });

      // 2. Procesar partidos finalizados para estadísticas generales
      partidos.forEach(p => {
        if (!p || p.puntos_local === null || p.puntos_visitante === null) return;

        const local = map.get(p.equipo_local_id);
        const visit = map.get(p.equipo_visitante_id);

        if (local && visit) {
          local.pj++;
          visit.pj++;
          local.pf += (p.puntos_local || 0);
          local.pc += (p.puntos_visitante || 0);
          visit.pf += (p.puntos_visitante || 0);
          visit.pc += (p.puntos_local || 0);

          if (p.puntos_local > p.puntos_visitante) {
            local.pg++;
            visit.pp++;
            local.puntos += 2;
            visit.puntos += 1;
          } else if (p.puntos_visitante > p.puntos_local) {
            visit.pg++;
            local.pp++;
            visit.puntos += 2;
            local.puntos += 1;
          } else {
            // En caso de empate (poco común en basket pero posible en algunas actas)
            local.puntos += 1;
            visit.puntos += 1;
          }
        }
      });

      const initialList = Array.from(map.values()).map(t => ({
        ...t,
        diff: t.pf - t.pc
      }));

      // 3. Función de comparación compleja (Condicional por categoría)
      const compareTeams = (a: TeamStanding, b: TeamStanding) => {
        // Criterio 1: Puntos totales (Siempre primero)
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;

        // Criterio 2: Desempate si NO es mini (Mini-liga / Enfrentamientos directos)
        if (!esMini) {
            const tiedWithSamePoints = initialList.filter(t => t.puntos === a.puntos).map(t => t.equipoId);
            
            if (tiedWithSamePoints.length > 1) {
                const getMiniStats = (targetId: number | string) => {
                    let mPts = 0, mPf = 0, mPc = 0;
                    partidos.forEach(p => {
                        if (!p || p.puntos_local === null || p.puntos_visitante === null) return;
                        
                        const isLocalTied = tiedWithSamePoints.includes(p.equipo_local_id);
                        const isVisitTied = tiedWithSamePoints.includes(p.equipo_visitante_id);
                        
                        if (isLocalTied && isVisitTied) {
                            if (p.equipo_local_id === targetId) {
                                mPf += p.puntos_local;
                                mPc += p.puntos_visitante;
                                if (p.puntos_local > p.puntos_visitante) mPts += 2;
                                else if (p.puntos_local < p.puntos_visitante) mPts += 1;
                                else mPts += 1;
                            } else if (p.equipo_visitante_id === targetId) {
                                mPf += p.puntos_visitante;
                                mPc += p.puntos_local;
                                if (p.puntos_visitante > p.puntos_local) mPts += 2;
                                else if (p.puntos_visitante < p.puntos_local) mPts += 1;
                                else mPts += 1;
                            }
                        }
                    });
                    return { pts: mPts, diff: mPf - mPc, pf: mPf };
                };

                const miniA = getMiniStats(a.equipoId);
                const miniB = getMiniStats(b.equipoId);

                if (miniB.pts !== miniA.pts) return miniB.pts - miniA.pts;
                if (miniB.diff !== miniA.diff) return miniB.diff - miniA.diff;
                if (miniB.pf !== miniA.pf) return miniB.pf - miniA.pf;
            }
        }

        // Criterio Final (o para categorías mini): Diferencia general
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.pf - a.pf;
      };

      initialList.sort(compareTeams);
      return initialList;
    } catch (e) {
      console.error("Error calculating standings", e);
      return [];
    }
  }, [equipos, partidos, esMini]);

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-100">
      <table className="w-full text-base text-left text-gray-700">
        <thead className="text-sm uppercase bg-fcbq-blue text-white">
          <tr>
            <th className="pl-4 pr-2 py-4 text-left w-1 whitespace-nowrap rounded-tl-lg">Pos</th>
            <th className="px-4 py-4">Equipo</th>
            <th className="px-4 py-4 text-center">PTS</th>
            <th className="px-4 py-4 text-center">PJ</th>
            <th className="px-4 py-4 text-center">PG</th>
            <th className="px-4 py-4 text-center">PP</th>
            <th className="px-4 py-4 text-center">PF</th>
            <th className="px-4 py-4 text-center">PC</th>
            <th className="px-4 py-4 text-center rounded-tr-lg">DIF</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => (
            <tr 
              key={team.equipoId} 
              onClick={() => onSelectTeam(team.equipoId)}
              className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${selectedTeamId === team.equipoId ? 'bg-blue-100 font-semibold' : ''}`}
            >
              <td className="pl-4 pr-2 py-4 text-left font-bold text-fcbq-blue">{index + 1}</td>
              <td className="px-4 py-4 font-medium flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center bg-white shadow-sm shrink-0">
                  {team.clubLogo ? (
                    <img src={team.clubLogo} alt="" className="w-full h-full object-contain rounded-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-[10px] text-slate-300 font-bold">LOGO</div>
                  )}
                </div>
                <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs uppercase tracking-tight font-bold text-slate-700">{team.nombre}</span>
              </td>
              <td className="px-4 py-4 text-center font-bold">{team.puntos}</td>
              <td className="px-4 py-4 text-center">{team.pj}</td>
              <td className="px-4 py-4 text-center text-green-600 font-bold">{team.pg}</td>
              <td className="px-4 py-4 text-center text-red-600 font-bold">{team.pp}</td>
              <td className="px-4 py-4 text-center text-gray-500">{team.pf}</td>
              <td className="px-4 py-4 text-center text-gray-500">{team.pc}</td>
              <td className="px-4 py-4 text-center text-gray-500">{team.diff}</td>
            </tr>
          ))}
          {standings.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-lg">Sin datos de clasificación disponibles para esta selección.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Standings;
