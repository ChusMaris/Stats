import type { PartidoMovimiento } from '../types';
import { normalizeScoreEvents } from './playerPlusMinus';

export interface MatchScorePoint {
  x: number;
  period: number;
  local: number;
  visitor: number;
}

export interface MatchPeriodScore {
  period: number;
  local: number;
  visitor: number;
}

export interface MatchScoreProgression {
  points: MatchScorePoint[];
  periodScores: MatchPeriodScore[];
  periodCount: number;
  hasEvents: boolean;
}

const getRemainingSeconds = (movement: PartidoMovimiento): number => {
  const minuteParts = String(movement.minuto ?? '0').split(':');
  const minutes = Number.parseInt(minuteParts[0] || '0', 10) || 0;
  const embeddedSeconds = Number.parseInt(minuteParts[1] || '0', 10) || 0;
  const seconds = movement.segundo ?? embeddedSeconds;
  return minutes * 60 + Number(seconds || 0);
};

export const buildMatchScoreProgression = (
  movements: readonly PartidoMovimiento[],
  matchId: number | string,
  isMini: boolean,
  configuredPeriods?: number
): MatchScoreProgression => {
  const sortedMovements = movements
    .filter(movement => String(movement.partido_id) === String(matchId))
    .sort((a, b) => {
      const periodDifference = Number(a.periodo || 1) - Number(b.periodo || 1);
      if (periodDifference !== 0) return periodDifference;

      const timeDifference = getRemainingSeconds(b) - getRemainingSeconds(a);
      if (timeDifference !== 0) return timeDifference;

      return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    })
    .map((movement, seq) => ({ ...movement, periodo: movement.periodo || 1, seq }));

  const normalizedEvents = normalizeScoreEvents(sortedMovements, isMini);
  const eventsByPeriod = new Map<number, Array<{ deltaL: number; deltaV: number }>>();

  Object.values(normalizedEvents).forEach(event => {
    const periodEvents = eventsByPeriod.get(event.period) || [];
    periodEvents.push({ deltaL: event.deltaL, deltaV: event.deltaV });
    eventsByPeriod.set(event.period, periodEvents);
  });

  const maxEventPeriod = Math.max(0, ...eventsByPeriod.keys());
  const periodCount = Math.max(1, Math.floor(configuredPeriods || 0), maxEventPeriod);
  const points: MatchScorePoint[] = [];
  const periodScores: MatchPeriodScore[] = [];
  let local = 0;
  let visitor = 0;

  for (let period = 1; period <= periodCount; period += 1) {
    const periodStartLocal = local;
    const periodStartVisitor = visitor;
    const periodEvents = eventsByPeriod.get(period) || [];

    points.push({ x: period - 1, period, local, visitor });
    periodEvents.forEach((event, index) => {
      local += event.deltaL;
      visitor += event.deltaV;
      points.push({
        x: period - 1 + (index + 1) / (periodEvents.length + 1),
        period,
        local,
        visitor
      });
    });
    points.push({ x: period, period, local, visitor });
    periodScores.push({
      period,
      local: local - periodStartLocal,
      visitor: visitor - periodStartVisitor
    });
  }

  return {
    points,
    periodScores,
    periodCount,
    hasEvents: eventsByPeriod.size > 0
  };
};