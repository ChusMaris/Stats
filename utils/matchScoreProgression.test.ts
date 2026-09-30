import { describe, expect, it } from 'vitest';
import { buildMatchScoreProgression } from './matchScoreProgression';

describe('buildMatchScoreProgression', () => {
  it('orders events by period and countdown time and returns cumulative score with period partials', () => {
    const progression = buildMatchScoreProgression([
      { id: 2, partido_id: 1, jugador_id: 10, periodo: 1, minuto: 6, marcador: '2-3' },
      { id: 3, partido_id: 1, jugador_id: 10, periodo: 2, minuto: 8, marcador: '4-5' },
      { id: 1, partido_id: 1, jugador_id: 10, periodo: 1, minuto: 8, marcador: '2-0' },
      { id: 4, partido_id: 2, jugador_id: 10, periodo: 1, minuto: 8, marcador: '99-99' }
    ], 1, false, 2);

    expect(progression.periodScores).toEqual([
      { period: 1, local: 2, visitor: 3 },
      { period: 2, local: 2, visitor: 2 }
    ]);
    expect(progression.points.at(-1)).toMatchObject({ x: 2, period: 2, local: 4, visitor: 5 });
    expect(progression.hasEvents).toBe(true);
  });

  it('accumulates mini-period score resets into whole-match totals', () => {
    const progression = buildMatchScoreProgression([
      { id: 1, partido_id: 1, jugador_id: 10, periodo: 1, minuto: 4, marcador: '4-2' },
      { id: 2, partido_id: 1, jugador_id: 10, periodo: 2, minuto: 4, marcador: '2-1' },
      { id: 3, partido_id: 1, jugador_id: 10, periodo: 2, minuto: 2, marcador: '2-3' }
    ], 1, true, 2);

    expect(progression.periodScores).toEqual([
      { period: 1, local: 4, visitor: 2 },
      { period: 2, local: 2, visitor: 3 }
    ]);
    expect(progression.points.at(-1)).toMatchObject({ local: 6, visitor: 5 });
  });

  it('reports no available progression when movements have no score markers', () => {
    const progression = buildMatchScoreProgression([
      { id: 1, partido_id: 1, jugador_id: 10, periodo: 1, minuto: 8 }
    ], 1, false, 4);

    expect(progression.hasEvents).toBe(false);
    expect(progression.periodScores).toHaveLength(4);
    expect(progression.points.at(-1)).toMatchObject({ local: 0, visitor: 0 });
  });
});