export interface ScoreMovement {
    seq: number;
    periodo?: unknown;
    marcador?: unknown;
}

export interface ScoreEvent {
    deltaL: number;
    deltaV: number;
    score: string;
    period: number;
}

export interface PlayerInterval {
    startSeq: number;
    endSeq: number;
    period: number;
}

export const normalizeScoreEvents = (
    movements: ScoreMovement[],
    isMini: boolean
): Record<number, ScoreEvent> => {
    const scoreEvents: Record<number, ScoreEvent> = {};
    let lastValidScore = { local: 0, visitor: 0, period: 0 };

    movements.forEach(movement => {
        if (typeof movement.marcador !== 'string' || !movement.marcador.includes('-')) return;

        const [localPart, visitorPart] = movement.marcador.split('-');
        const currentLocal = Number.parseInt(localPart, 10);
        const currentVisitor = Number.parseInt(visitorPart, 10);
        if (!Number.isFinite(currentLocal) || !Number.isFinite(currentVisitor)) return;

        const period = Number(movement.periodo || 0);
        const startsMiniPeriod = isMini && period !== lastValidScore.period;
        const baseLocal = startsMiniPeriod ? 0 : lastValidScore.local;
        const baseVisitor = startsMiniPeriod ? 0 : lastValidScore.visitor;
        const deltaL = currentLocal - baseLocal;
        const deltaV = currentVisitor - baseVisitor;

        if (deltaL < 0 || deltaV < 0 || (deltaL === 0 && deltaV === 0)) return;

        scoreEvents[movement.seq] = {
            deltaL,
            deltaV,
            score: movement.marcador,
            period,
        };
        lastValidScore = { local: currentLocal, visitor: currentVisitor, period };
    });

    return scoreEvents;
};

export const calculateIntervalPlusMinus = (
    scoreEvents: Record<number, ScoreEvent>,
    intervals: PlayerInterval[],
    isLocal: boolean
): number => intervals.reduce((plusMinus, interval) => {
    return plusMinus + Object.entries(scoreEvents).reduce((intervalImpact, [sequence, event]) => {
        const eventSequence = Number(sequence);
        if (eventSequence <= interval.startSeq || eventSequence > interval.endSeq) return intervalImpact;

        return intervalImpact + (isLocal
            ? event.deltaL - event.deltaV
            : event.deltaV - event.deltaL);
    }, 0);
}, 0);

interface PlusMinusSources {
    isMini: boolean;
    calculated?: number;
    view?: number;
    stored?: number;
}

export const selectFinalPlusMinus = ({
    isMini,
    calculated,
    view,
    stored = 0,
}: PlusMinusSources): number => {
    if (!isMini && calculated !== undefined) return calculated;
    if (view !== undefined) return view;
    return stored;
};