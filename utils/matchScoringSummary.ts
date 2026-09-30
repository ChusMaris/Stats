import type { EstadisticaJugadorPartido } from '../types';

type MatchScoringPlayerStats = Pick<
  EstadisticaJugadorPartido,
  | 'puntos'
  | 't1_anotados'
  | 't1_intentados'
  | 't2_anotados'
  | 't2_intentados'
  | 't3_anotados'
  | 't3_intentados'
>;

export interface MatchShotSummary {
  made: number;
  attempted: number;
  points: number;
  percentage: number | null;
}

export interface MatchScoringSummary {
  points: number;
  t1: MatchShotSummary;
  t2: MatchShotSummary;
  t3: MatchShotSummary;
  fieldGoals: MatchShotSummary;
  total: MatchShotSummary;
}

const createShotSummary = (made: number, attempted: number, points: number): MatchShotSummary => ({
  made,
  attempted,
  points,
  percentage: attempted > 0 ? (made / attempted) * 100 : null
});

export const aggregateMatchScoring = (
  playerStats: readonly MatchScoringPlayerStats[],
  officialScore: number | null | undefined
): MatchScoringSummary => {
  const t1Made = playerStats.reduce((sum, stat) => sum + (stat.t1_anotados || 0), 0);
  const t1Attempted = playerStats.reduce((sum, stat) => sum + (stat.t1_intentados || 0), 0);
  const t2Made = playerStats.reduce((sum, stat) => sum + (stat.t2_anotados || 0), 0);
  const t2Attempted = playerStats.reduce((sum, stat) => sum + (stat.t2_intentados || 0), 0);
  const t3Made = playerStats.reduce((sum, stat) => sum + (stat.t3_anotados || 0), 0);
  const t3Attempted = playerStats.reduce((sum, stat) => sum + (stat.t3_intentados || 0), 0);
  const points = officialScore ?? playerStats.reduce((sum, stat) => sum + (stat.puntos || 0), 0);
  const fieldGoalsMade = t2Made + t3Made;
  const fieldGoalsAttempted = t2Attempted + t3Attempted;
  const totalMade = t1Made + fieldGoalsMade;
  const totalAttempted = t1Attempted + fieldGoalsAttempted;

  return {
    points,
    t1: createShotSummary(t1Made, t1Attempted, t1Made),
    t2: createShotSummary(t2Made, t2Attempted, t2Made * 2),
    t3: createShotSummary(t3Made, t3Attempted, t3Made * 3),
    fieldGoals: createShotSummary(
      fieldGoalsMade,
      fieldGoalsAttempted,
      t2Made * 2 + t3Made * 3
    ),
    total: createShotSummary(totalMade, totalAttempted, points)
  };
};