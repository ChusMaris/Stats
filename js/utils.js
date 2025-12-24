// js/utils.js

function getMatchIdFromFileName(fn) {
    return fn.split('.')[0];
}

function getTeamName(match, id) {
    let name = 'N/D';
    if (match.localId === id) {
        name = match.teams.find(t => t.teamIdIntern === id)?.name || name;
    } else if (match.visitId === id) {
        name = match.teams.find(t => t.teamIdIntern === id)?.name || name;
    }
    const normalized = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    // Asumiendo que teamNormalization está definido en config.js
    teamNormalization[id] = { original: name, normalized: normalized }; 
    return { original: name, normalized: normalized };
}

/**
 * 🔑 FUNCIÓN CRÍTICA DE MINI-BASKET
 * Extrae la puntuación final de un partido a partir de su nombre de archivo
 * (ej. 'J1_P1_27_77.json' -> { localScore: 27, visitScore: 77 }).
 */
function getScoreFromFileName(fileName) {
    // Patrón esperado: JX_T1_SCORE1_SCORE2.json
    const parts = fileName.split('_');
    if (parts.length < 4) return null;

    // El tercer y cuarto elemento son las puntuaciones.
    const score1 = parseInt(parts[2]);
    const score2 = parseInt(parts[3].split('.')[0]); // Quitar la extensión .json

    if (isNaN(score1) || isNaN(score2)) return null;

    return { localScore: score1, visitScore: score2 };
}


/**
 * Formatea minutos a formato HH:MM (Horas:Minutos).
 * @param {number} minutes - El tiempo total en minutos (puede ser float).
 */
function formatTime(minutes) {
    if (isNaN(minutes) || minutes < 0) return '00:00';
    
    // 1. Redondeamos el número de minutos a un entero.
    const totalMinutes = Math.round(minutes);
    
    // 2. Calculamos las horas (h) y los minutos restantes (m).
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60; 

    // 3. Devolvemos el formato HH:MM.
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Genera el HTML para mostrar la eficiencia de tiro.
 */
function renderShotEfficiency(successful, attempted, format = 'full') {
    if (format === 'successful_only') {
        return successful.toString();
    }
    
    const ratio = attempted > 0 ? (successful / attempted * 100) : 0;
    
    // El formato 'compact_pct' es el que se usa para Tiros 1
    let percentageDisplay = `<span style="font-size: 0.9em;">(${ratio.toFixed(1)}%)</span>`; // Formato 'full' (con paréntesis)
    
    if (format === 'compact_pct') {
         // Se aplica font-size: 0.9em directamente al porcentaje.
         percentageDisplay = `<span style="font-size: 0.9em;">${ratio.toFixed(1)}%</span>`; // Formato solicitado para Tiros 1 (sin paréntesis)
    }

    return `
        <span class="shot-efficiency" style="white-space: nowrap;">
            <span style="color: var(--header-color); font-weight: bold;">${successful}/${attempted}</span>
            ${percentageDisplay}
        </span>
    `;
}

/**
 * Función de comparación para el sorting de tablas.
 */
function compareValues(key, order = 'asc', type = 'numeric') {
    return (a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (type === 'numeric' || type === 'float' || type === 'ratio') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
            if (isNaN(valA)) valA = 0;
            if (isNaN(valB)) valB = 0;
        } else if (type === 'text') {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        } else if (type === 'ratio') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }

        let comparison = 0;
        if (valA > valB) {
            comparison = 1;
        } else if (valA < valB) {
            comparison = -1;
        }

        return order === 'desc' ? (comparison * -1) : comparison;
    };
}