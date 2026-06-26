
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

  const getInitials = (name: string) => {
    if (!name) return '';
    const clean = name.replace(/[^A-Z0-9\s]/gi, '').trim();
    const words = clean.split(/\s+/).filter(w => {
      const u = w.toUpperCase();
      return u !== 'C' && u !== 'CB' && u !== 'CE' && u !== 'A' && u !== 'B' && u !== 'CLUB' && u !== 'BASKET' && u !== 'BÀSQUET';
    });
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="bg-surface-container-low px-sm py-2.5 border-b border-outline-variant/30 flex justify-between items-center">
        <h2 className="text-[10px] font-bold text-outline uppercase tracking-wider">Clasificación Actual</h2>
        <span className="text-[10px] font-medium text-outline truncate max-w-[180px]">
          {esMini ? 'Mini-Basket' : 'Principal'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[550px] lg:min-w-full">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant/20">
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase pl-4 w-10">Pos</th>
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase">Equipo</th>
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase text-center w-10">PJ</th>
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase text-center w-10">PG</th>
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase text-center w-10">PP</th>
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase text-center w-12">PF</th>
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase text-center w-12">PC</th>
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase text-center w-12">DIF</th>
              <th className="px-base py-2.5 text-[10px] font-bold text-outline uppercase text-center pr-4 w-12">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {standings.map((team, index) => {
              const isSelected = selectedTeamId === team.equipoId;
              return (
                <tr 
                  key={team.equipoId} 
                  onClick={() => onSelectTeam(team.equipoId)}
                  className={`cursor-pointer transition-colors hover:bg-surface-container-low/80 ${
                    isSelected 
                      ? 'bg-primary/5' 
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <td className={`px-base py-2.5 text-data-tabular pl-4 font-bold ${
                    isSelected ? 'text-primary' : 'text-outline'
                  }`}>
                    {index + 1}
                  </td>
                  <td className="px-base py-2.5">
                    <div className="flex items-center gap-xs">
                      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-white">
                        {team.clubLogo ? (
                          <img 
                            src={team.clubLogo} 
                            alt="" 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`w-full h-full rounded-full flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary' : 'bg-outline-variant'
                          }`}>
                            <span className="text-[7px] font-bold text-white">
                              {getInitials(team.nombre)}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[14px] truncate uppercase max-w-[160px] sm:max-w-xs ${
                        isSelected ? 'font-bold text-primary' : 'text-on-surface-variant font-medium'
                      }`}>
                        {team.nombre}
                      </span>
                    </div>
                  </td>
                  <td className={`px-base py-2.5 text-data-tabular text-center text-[14px] ${
                    isSelected ? 'font-bold text-primary' : 'text-slate-600'
                  }`}>
                    {team.pj}
                  </td>
                  <td className={`px-base py-2.5 text-data-tabular text-center text-[14px] ${
                    isSelected ? 'font-bold text-primary' : 'text-slate-600'
                  }`}>
                    {team.pg}
                  </td>
                  <td className={`px-base py-2.5 text-data-tabular text-center text-[14px] ${
                    isSelected ? 'font-bold text-primary' : 'text-slate-600'
                  }`}>
                    {team.pp}
                  </td>
                  <td className={`px-base py-2.5 text-data-tabular text-center text-[14px] ${
                    isSelected ? 'font-bold text-primary' : 'text-slate-600'
                  }`}>
                    {team.pf}
                  </td>
                  <td className={`px-base py-2.5 text-data-tabular text-center text-[14px] ${
                    isSelected ? 'font-bold text-primary' : 'text-slate-600'
                  }`}>
                    {team.pc}
                  </td>
                  <td className={`px-base py-2.5 text-data-tabular text-center text-[14px] ${
                    isSelected ? 'font-bold text-primary' : 'text-slate-600'
                  }`}>
                    {team.diff > 0 ? `+${team.diff}` : team.diff}
                  </td>
                  <td className={`px-base py-2.5 text-data-tabular text-center font-bold text-[14px] pr-4 ${
                    isSelected ? 'text-primary' : 'text-slate-800'
                  }`}>
                    {team.puntos}
                  </td>
                </tr>
              );
            })}
            {standings.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-outline text-xs italic">
                  Sin datos de clasificación disponibles para esta selección.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Standings;
