import { describe, expect, it } from 'vitest';
import { aggregateMatchScoring } from './matchScoringSummary';

describe('aggregateMatchScoring', () => {
  it('combines two-point and three-point shots without free throws in field goals', () => {
    const summary = aggregateMatchScoring([
      {
        puntos: 20,
        t1_anotados: 2,
        t1_intentados: 3,
        t2_anotados: 4,
        t2_intentados: 8,
        t3_anotados: 2,
        t3_intentados: 5
      }
    ], 20);

    expect(summary.t1.points).toBe(2);
    expect(summary.t2.points).toBe(8);
    expect(summary.t3.points).toBe(6);
    expect(summary.fieldGoals).toEqual({ made: 6, attempted: 13, points: 14, percentage: (6 / 13) * 100 });
    expect(summary.total).toEqual({ made: 8, attempted: 16, points: 20, percentage: 50 });
  });

  it('preserves an official zero score and marks shot efficiency unavailable without attempts', () => {
    const summary = aggregateMatchScoring([
      {
        puntos: 7,
        t1_anotados: 0,
        t1_intentados: 0,
        t2_anotados: 0,
        t2_intentados: 0,
        t3_anotados: 0,
        t3_intentados: 0
      }
    ], 0);

    expect(summary.points).toBe(0);
    expect(summary.t1.percentage).toBeNull();
    expect(summary.t2.percentage).toBeNull();
    expect(summary.t3.percentage).toBeNull();
    expect(summary.total).toEqual({ made: 0, attempted: 0, points: 0, percentage: null });
  });

  it('falls back to individual points when the official score is unavailable', () => {
    const summary = aggregateMatchScoring([
      {
        puntos: 7,
        t1_anotados: 1,
        t1_intentados: 2,
        t2_anotados: 3,
        t2_intentados: 6,
        t3_anotados: 0,
        t3_intentados: 1
      }
    ], null);

    expect(summary.points).toBe(7);
    expect(summary.total.points).toBe(7);
  });
});