import { describe, expect, it } from 'vitest';
import { calculateIntervalPlusMinus, normalizeScoreEvents, selectFinalPlusMinus } from './playerPlusMinus';

describe('normalizeScoreEvents', () => {
    it('keeps the accumulated score base between non-mini periods', () => {
        const events = normalizeScoreEvents([
            { seq: 1, periodo: 1, marcador: '10-8' },
            { seq: 2, periodo: 1, marcador: '10-8' },
            { seq: 3, periodo: 2, marcador: '12-9' },
        ], false);

        expect(events).toEqual({
            1: { deltaL: 10, deltaV: 8, score: '10-8', period: 1 },
            3: { deltaL: 2, deltaV: 1, score: '12-9', period: 2 },
        });
    });

    it('rejects component regressions and keeps the last valid base', () => {
        const events = normalizeScoreEvents([
            { seq: 1, periodo: 1, marcador: '10-8' },
            { seq: 2, periodo: 2, marcador: '9-12' },
            { seq: 3, periodo: 2, marcador: '7-6' },
            { seq: 4, periodo: 2, marcador: '12-9' },
        ], false);

        expect(events).toEqual({
            1: { deltaL: 10, deltaV: 8, score: '10-8', period: 1 },
            4: { deltaL: 2, deltaV: 1, score: '12-9', period: 2 },
        });
    });

    it('resets the score base at the start of every mini period', () => {
        const events = normalizeScoreEvents([
            { seq: 1, periodo: 1, marcador: '4-2' },
            { seq: 2, periodo: 2, marcador: '2-1' },
            { seq: 3, periodo: 2, marcador: '2-3' },
        ], true);

        expect(events).toEqual({
            1: { deltaL: 4, deltaV: 2, score: '4-2', period: 1 },
            2: { deltaL: 2, deltaV: 1, score: '2-1', period: 2 },
            3: { deltaL: 0, deltaV: 2, score: '2-3', period: 2 },
        });
    });
});

describe('calculateIntervalPlusMinus', () => {
    it('assigns only valid in-stint events using the team perspective', () => {
        const events = normalizeScoreEvents([
            { seq: 1, periodo: 1, marcador: '2-0' },
            { seq: 2, periodo: 1, marcador: '2-3' },
            { seq: 3, periodo: 1, marcador: '1-5' },
            { seq: 4, periodo: 1, marcador: '4-3' },
        ], false);
        const firstStint = [{ startSeq: 0, endSeq: 2, period: 1 }];
        const secondStint = [{ startSeq: 2, endSeq: 4, period: 1 }];

        expect(calculateIntervalPlusMinus(events, firstStint, true)).toBe(-1);
        expect(calculateIntervalPlusMinus(events, firstStint, false)).toBe(1);
        expect(calculateIntervalPlusMinus(events, secondStint, true)).toBe(2);
        expect(calculateIntervalPlusMinus(events, secondStint, false)).toBe(-2);
    });
});

describe('selectFinalPlusMinus', () => {
    it('prefers the calculated value for non-mini categories', () => {
        expect(selectFinalPlusMinus({ isMini: false, calculated: -3, view: 8, stored: 4 })).toBe(-3);
        expect(selectFinalPlusMinus({ isMini: false, calculated: 0, view: 8, stored: 4 })).toBe(0);
    });

    it('keeps the view value for mini categories', () => {
        expect(selectFinalPlusMinus({ isMini: true, calculated: -3, view: 8, stored: 4 })).toBe(8);
    });

    it('falls back when the preferred source is unavailable', () => {
        expect(selectFinalPlusMinus({ isMini: false, view: 8, stored: 4 })).toBe(8);
        expect(selectFinalPlusMinus({ isMini: true, stored: 4 })).toBe(4);
    });
});