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
 * Formatea una cadena de fecha/hora al formato español "DD/mes/YYYY HH:MM AM/PM".
 * @param {string} dateString - La cadena de fecha/hora en formato inglés (ej. "Oct 11, 2025 12:00:00 PM").
 * @returns {string} La cadena de fecha/hora formateada.
 */
function formatDateToSpanish(dateString) {
    if (!dateString) return 'N/D';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Fecha Inválida';
    }

    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC' // Assuming the input date string is in UTC. Adjust if not.
    };
    // Use 'es-ES' locale for Spanish formatting
    return new Intl.DateTimeFormat('es-ES', options).format(date);
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

/**
 * Genera un color HSL en un gradiente de rojo a verde o verde a rojo
 * basado en el porcentaje y si un porcentaje más alto es mejor o peor.
 * @param {number} percentage - El porcentaje a convertir en color (0-100).
 * @param {boolean} isHigherBetter - Si true, los porcentajes más altos son más verdes. Si false, más rojos.
 * @returns {string} Una cadena de color HSL (ej. "hsl(120, 100%, 40%)").
 */
function getColorForPercentage(percentage, isHigherBetter) {
    let hue;
    if (isHigherBetter) {
        // Higher is better: 0% is red (0), 100% is green (120)
        hue = (percentage / 100) * 120;
    } else {
        // Higher is worse: 0% is green (120), 100% is red (0)
        hue = 120 - ((percentage / 100) * 120);
    }
    // Clamp hue to valid range [0, 120]
    hue = Math.max(0, Math.min(120, hue));

    // You can adjust saturation and lightness if needed for intensity based on percentage
    // For now, let's keep them relatively constant for a clear hue change
    const saturation = 100; // Full saturation
    const lightness = 40;  // Medium lightness for good visibility

    return `hsl(${hue.toFixed(0)}, ${saturation}%, ${lightness}%)`;
}

/**
 * Genera el HTML para un gráfico circular de progreso.
 * @param {number} successful - El número de éxitos.
 * @param {number} attempted - El número total de intentos.
 * @param {boolean} isHigherBetter - Opcional. Si true, los porcentajes más altos son mejores (verde). Si false, más altos son peores (rojo). Por defecto es true.
 */
function createCircularProgressBar(successful, attempted, isHigherBetter = true) {
    const percentage = attempted > 0 ? (successful / attempted) * 100 : 0;
    const clampedPercentage = Math.max(0, Math.min(100, percentage)); // Asegura que esté entre 0 y 100
    const strokeDashArray = `${clampedPercentage.toFixed(0)} 100`;
    const strokeColor = getColorForPercentage(clampedPercentage, isHigherBetter);

    return `
        <svg viewBox="0 0 36 36" class="circular-chart shot-circle">
            <path class="circle-bg"
                d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path class="circle"
                stroke="${strokeColor}"
                stroke-dasharray="${strokeDashArray}"
                d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="22" class="percentage">${percentage.toFixed(0)}%</text>
        </svg>
    `;
}
