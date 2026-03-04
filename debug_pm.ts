
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zvojniiaftqwdaggfvma.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2puaWlhZnRxd2RhZ2dmdm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTE0MDYsImV4cCI6MjA4MzYyNzQwNn0.9Xht9Z_Bmfp05U6G-_JrETIqsE87RFd-JXQMpaHrmzM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const calculatePlusMinusFromMovements = (
    movements: any[], 
    myTeamPlayerIds: Set<string>,
    esMini: boolean,
    minsPerPeriod: number,
    matchIsLocal: Record<string, boolean>
) => {
    const playerPlusMinus: Record<string, number> = {};
    const playerSeconds: Record<string, number> = {};
    
    const movementsByMatch: Record<string, any[]> = {};
    movements.forEach(m => {
        const mid = String(m.partido_id);
        if (!movementsByMatch[mid]) movementsByMatch[mid] = [];
        movementsByMatch[mid].push(m);
    });

    Object.keys(movementsByMatch).forEach(matchId => {
        const isLocal = matchIsLocal[matchId];
        // 1. Sort and Assign Sequence
        const matchMovs = movementsByMatch[matchId].sort((a, b) => {
            const pA = Number(a.periodo || 0);
            const pB = Number(b.periodo || 0);
            if (pA !== pB) return pA - pB;
            const mA = typeof a.minuto === 'number' ? a.minuto : parseInt(String(a.minuto).split(':')[0] || '0', 10);
            const mB = typeof b.minuto === 'number' ? b.minuto : parseInt(String(b.minuto).split(':')[0] || '0', 10);
            if (mA !== mB) return mB - mA; // Descending for time
            const sA = Number(a.segundo || 0);
            const sB = Number(b.segundo || 0);
            if (sA !== sB) return sB - sA; // Descending for time
            return Number(a.id) - Number(b.id); // Ascending for ID
        }).map((m, index) => ({ ...m, seq: index }));

        // 2. Identify Score Events
        const scoreEvents: { seq: number, deltaL: number, deltaV: number, score: string, period: number }[] = [];
        let lastScore = { l: 0, v: 0 };
        let lastPeriod = 0;

        matchMovs.forEach(m => {
            const p = Number(m.periodo || 0);
            
            // Handle Period Change
            if (p !== lastPeriod) {
                if (esMini) {
                    lastScore = { l: 0, v: 0 };
                }
                lastPeriod = p;
            }

            if (m.marcador && m.marcador.includes('-')) {
                const parts = m.marcador.split('-');
                const currL = parseInt(parts[0] || '0');
                const currV = parseInt(parts[1] || '0');
                
                let deltaL = 0;
                let deltaV = 0;

                deltaL = currL - lastScore.l;
                deltaV = currV - lastScore.v;

                if (deltaL !== 0 || deltaV !== 0) {
                    scoreEvents.push({ seq: m.seq, deltaL, deltaV, score: m.marcador, period: p });
                    lastScore = { l: currL, v: currV };
                }
            }
        });

        // 3. Identify Player Intervals
        const getSeconds = (m: any) => {
            const min = typeof m.minuto === 'number' ? m.minuto : parseInt(String(m.minuto).split(':')[0] || '0', 10);
            const sec = Number(m.segundo || 0);
            return min * 60 + sec;
        };

        const playerIntervals: Record<string, { startSeq: number, endSeq: number, startSecs: number, endSecs: number }[]> = {};
        const playerMoves: Record<string, typeof matchMovs> = {};
        const playersWithEventsInPeriod: Record<string, Set<number>> = {};

        matchMovs.forEach(m => {
            const pid = String(m.jugador_id);
            if (!pid) return;
            if (!playerMoves[pid]) playerMoves[pid] = [];
            playerMoves[pid].push(m);
            
            const p = Number(m.periodo || 0);
            if (!playersWithEventsInPeriod[pid]) playersWithEventsInPeriod[pid] = new Set();
            playersWithEventsInPeriod[pid].add(p);
        });

        Object.keys(playersWithEventsInPeriod).forEach(pid => {
            playerIntervals[pid] = [];
            const periods = Array.from(playersWithEventsInPeriod[pid]).sort((a,b) => a-b);
            
            periods.forEach(p => {
                const pMoves = (playerMoves[pid] || []).filter(m => Number(m.periodo) === p);
                const subEvents = pMoves.filter(m => ['112', '115'].includes(String(m.tipo_movimiento))).sort((a,b) => a.seq - b.seq);
                
                let currentStartSeq: number | null = null;
                let currentStartSecs: number | null = null;

                const firstSub = subEvents[0];
                
                if (!firstSub || String(firstSub.tipo_movimiento) === '115') {
                    currentStartSeq = matchMovs.find(m => Number(m.periodo) === p)?.seq || 0;
                    currentStartSecs = minsPerPeriod * 60;
                }

                if (currentStartSeq !== null) {
                    const firstOut = subEvents.find(m => String(m.tipo_movimiento) === '115');
                    if (firstOut) {
                        playerIntervals[pid].push({
                            startSeq: currentStartSeq,
                            endSeq: firstOut.seq,
                            startSecs: currentStartSecs!,
                            endSecs: getSeconds(firstOut)
                        });
                        currentStartSeq = null;
                    } else {
                        const lastEventOfQ = matchMovs.filter(m => Number(m.periodo) === p).pop();
                        playerIntervals[pid].push({
                            startSeq: currentStartSeq,
                            endSeq: lastEventOfQ ? lastEventOfQ.seq : 999999,
                            startSecs: currentStartSecs!,
                            endSecs: 0
                        });
                    }
                }

                subEvents.forEach(ev => {
                    if (String(ev.tipo_movimiento) === '112') {
                        const nextOut = subEvents.find(m => String(m.tipo_movimiento) === '115' && m.seq > ev.seq);
                        if (nextOut) {
                            playerIntervals[pid].push({
                                startSeq: ev.seq,
                                endSeq: nextOut.seq,
                                startSecs: getSeconds(ev),
                                endSecs: getSeconds(nextOut)
                            });
                        } else {
                            const lastEventOfQ = matchMovs.filter(m => Number(m.periodo) === p).pop();
                            playerIntervals[pid].push({
                                startSeq: ev.seq,
                                endSeq: lastEventOfQ ? lastEventOfQ.seq : 999999,
                                startSecs: getSeconds(ev),
                                endSecs: 0
                            });
                        }
                    }
                });
            });
        });

        // 4. Calculate Stats
        Object.keys(playerIntervals).forEach(pid => {
            if (!myTeamPlayerIds.has(pid)) return;

            const key = `${matchId}_${pid}`;
            let pm = 0;
            let secs = 0;

            console.log(`\nPlayer ${pid} Intervals:`);
            playerIntervals[pid].forEach(interval => {
                secs += (interval.startSecs - interval.endSecs);
                console.log(`  [${interval.startSeq} - ${interval.endSeq}] (${interval.startSecs}s - ${interval.endSecs}s)`);
                
                scoreEvents.forEach(scoreEv => {
                    if (scoreEv.seq > interval.startSeq && scoreEv.seq <= interval.endSeq) {
                        const impact = isLocal ? (scoreEv.deltaL - scoreEv.deltaV) : (scoreEv.deltaV - scoreEv.deltaL);
                        pm += impact;
                        console.log(`    Score Event: ${scoreEv.score} (P${scoreEv.period}) DeltaL:${scoreEv.deltaL} DeltaV:${scoreEv.deltaV} Impact:${impact} -> PM:${pm}`);
                    }
                });
            });

            playerSeconds[key] = secs;
            playerPlusMinus[key] = pm;
            console.log(`Total PM for ${pid}: ${pm}`);
        });
    });

    return { playerPlusMinus, playerSeconds };
};

async function run() {
    const MATCH_ID = 'f5bc4270-eedb-4712-96e9-f3ae051cf7e1';
    
    console.log("Fetching match info...");
    const { data: match } = await supabase.from('partidos').select('*, competiciones(*, categorias(*))').eq('id', MATCH_ID).single();
    
    if (!match) {
        console.error("Match not found");
        return;
    }

    const esMini = match.competiciones?.categorias?.es_mini || false;
    console.log(`Match: ${match.id}`);
    console.log(`esMini: ${esMini}`);

    console.log("Fetching ALL movements for Aidan...");
    const AIDAN_ID = '10862997-0bc4-4e16-b0e3-1557f3f7a6a6';
    const { data: movements, error } = await supabase
        .from('partido_movimientos')
        .select('*')
        .eq('partido_id', MATCH_ID)
        .eq('jugador_id', AIDAN_ID)
        .order('periodo', { ascending: true })
        .order('minuto', { ascending: false })
        .order('segundo', { ascending: false });
        
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${movements.length} movements for Aidan:`);
    movements.forEach(m => {
        console.log(`P${m.periodo} ${m.minuto}:${m.segundo} Type:${m.tipo_movimiento} Desc:${m.descripcion} Marcador:${m.marcador}`);
    });

    // Also fetch all movements to see sequence
    const { data: allMovs } = await supabase.from('partido_movimientos').select('*').eq('partido_id', MATCH_ID);
    
    // Use the same logic as the app to see intervals
    const myTeamPlayerIds = new Set([AIDAN_ID]);
    const matchIsLocal = { [MATCH_ID]: true }; 
    const minsPerPeriod = esMini ? 6 : 10;

    // We need to pass the full movements array to the calculator
    // But first, let's just see Aidan's presence.
}

run();
