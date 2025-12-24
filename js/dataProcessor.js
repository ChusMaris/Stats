// js/dataProcessor.js (Fichero completo con todas las correcciones V3.0)

// Depende de: config.js (variables globales), uiRenderer.js (funciones de renderizado), utils.js

/**
 * Analiza el historial de puntuación de un partido para determinar cuántos
 * períodos ganó el equipo local y el visitante.
 */
function calculatePeriodsResult(match) {
    if (!match.score || match.score.length === 0) {
        return { periodsWonLocal: 0, periodsWonVisit: 0 };
    }
    
    const periodScores = {}; 
    let maxPeriod = 0;

    match.score.forEach(scoreEntry => {
        periodScores[scoreEntry.period] = {
            local: scoreEntry.local || 0,
            visit: scoreEntry.visit || 0
        };
        if (scoreEntry.period > maxPeriod) {
            maxPeriod = scoreEntry.period;
        }
    });

    let periodsWonLocal = 0;
    let periodsWonVisit = 0;
    let previousLocalScore = 0;
    let previousVisitScore = 0;

    for (let i = 1; i <= maxPeriod; i++) {
        const finalScore = periodScores[i];
        if (!finalScore) continue;

        const currentLocalScore = finalScore.local;
        const currentVisitScore = finalScore.visit;

        const periodLocalScore = currentLocalScore - previousLocalScore;
        const periodVisitScore = currentVisitScore - previousVisitScore;

        if (periodLocalScore > periodVisitScore) {
            periodsWonLocal++;
        } else if (periodVisitScore > periodLocalScore) {
            periodsWonVisit++;
        }
        
        previousLocalScore = currentLocalScore;
        previousVisitScore = currentVisitScore;
    }

    return { periodsWonLocal: periodsWonLocal, periodsWonVisit: periodsWonVisit };
}

/**
 * Ligas normales (Baloncesto Estándar FCBQ): 2 puntos por victoria, 1 por derrota/empate.
 */
const getNormalLeaguePoints = (teamScore, opponentScore) => {
    // Victoria (Gana): 2 puntos
    if (teamScore > opponentScore) return 2;
    // Derrota o Empate (No Gana): 1 punto
    return 1; 
};

/**
 * Ligas de Mini-Basket: 2 puntos por período ganado.
 * (Esta función ya no se usa, la lógica se aplica en processMatch)
 */
const getMiniBasketLeaguePoints = (teamPeriodsWon) => {
    return teamPeriodsWon * 2; 
};

/**
 * Calcula los datos para renderizar la tabla de clasificación.
 */

function calculateClassification(summaries) {
    if (Object.keys(processedTeams).length === 0) {
         processAllData();
    }
    
    // NOTA: La ordenación de desempate por Bàsquet-Average de enfrentamiento directo
    // requiere un segundo paso de cálculo complejo que se implementará más adelante.
    // Por ahora, ordenamos por Puntos (Ptos) y luego por Diferencia (diff)
    return Object.values(processedTeams).map(t => ({
        name: t.name,
        J: t.stats.J,
        G: t.stats.G,
        P: t.stats.P,
        NP: t.stats.NP,
        PF: t.stats.GF,
        PC: t.stats.GC,
        diff: t.stats.GF - t.stats.GC,
        Ptos: t.stats.Puntos
    })).sort(compareValues('Ptos', 'desc', 'numeric'))
       .sort((a, b) => {
           // Si los puntos son iguales, desempatar por Bàsquet-Average General (diff).
           // Este es un desempate provisional, el definitivo es por Enfrentamiento Directo.
           if (a.Ptos === b.Ptos) {
               return b.diff - a.diff; // Más diferencia (mayor Bàsquet-Average) va primero
           }
           return b.Ptos - a.Ptos; // Por defecto, ordenar por puntos
       });
}


function getPointsEvolutionData() {
    const data = [];
    const teamNames = Object.keys(processedTeams);

    teamNames.forEach(teamName => {
        const team = processedTeams[teamName];
        let cumulativePF = 0;
        
        const validMatches = team.matches.filter(m => {
            const j = parseInt(m.jornada);
            return !isNaN(j) && j > 0;
        });

        validMatches.sort((a, b) => parseInt(a.jornada) - parseInt(b.jornada));
        
        let evolutionPoints = validMatches.map(m => {
            cumulativePF += parseInt(m.score) || 0; 
            const numericJornada = parseInt(m.jornada);
            
            return {
                x: numericJornada,
                y: cumulativePF
            };
        });
        
        evolutionPoints.unshift({ x: 0, y: 0 });

        evolutionPoints = evolutionPoints.map(p => ({
            x: Number(p.x),
            y: Number(p.y)
        }));

        if (evolutionPoints.length > 1) { 
            data.push({
                teamName: teamName,
                data: evolutionPoints
            });
        }
    });

    return data;
}

/**
 * Carga el archivo categories.json y rellena el selector.
 */
async function loadCategoryConfiguration() {
    try {
        const response = await fetch('./categories.json');
        if (!response.ok) {
            // Si el archivo no existe o hay error, asume una configuración por defecto.
            console.error("No se pudo cargar categories.json. Usando configuración por defecto.");
            categoryConfiguration = [];
            return;
        }
        const config = await response.json();
        categoryConfiguration = config.categories || [];
        
        // Rellenar el selector de categorías
        categorySelector.innerHTML = '<option value="">-- Seleccionar --</option>';
        categoryConfiguration.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.folder; 
            option.textContent = cat.name; 
            categorySelector.appendChild(option);
        });

    } catch (error) {
        console.error(`🔴 ERROR de configuración: ${error.message}`);
    }
}


function processAllData() {
    processedTeams = {};
    const summaries = allMatchSummaries;
    
    // 1. Obtener la configuración y comprobar la bandera Mini-Basket
    const currentCategoryFolder = categorySelector.value;
    const currentCategory = categoryConfiguration.find(c => c.folder === currentCategoryFolder);
    
    if (!currentCategory) {
        console.error("No se encontró la configuración para la categoría seleccionada.");
        toggleDashboardView(false);
        return;
    }
    
    const isMiniBasket = currentCategory.is_mini_basket;

    // 2. Inicialización de equipos
    Object.keys(summaries).forEach(matchId => {
        const match = summaries[matchId];
        
        // CRÍTICO: Inicialización por nombre de equipo
        const localTeam = match.teams.find(t => t.teamIdIntern === match.localId);
        const visitTeam = match.teams.find(t => t.teamIdIntern === match.visitId);
        
        // Obtenemos directamente los nombres del JSON. Estos son las claves de processedTeams.
        const localName = localTeam ? localTeam.name : 'Equipo Local Desconocido';
        const visitName = visitTeam ? visitTeam.name : 'Equipo Visitante Desconocido';
        
        [localName, visitName].forEach(name => {
            if (!processedTeams[name]) {
                processedTeams[name] = {
                    name: name,
                    // Estadísticas de clasificación
                    stats: { J: 0, G: 0, P: 0, NP: 0, GF: 0, GC: 0, Puntos: 0 },
                    matches: [],
                    players: {},
                    jornadaData: {} 
                };
            }
        });
    });

    // 3. Procesamiento de partidos y aplicación de reglas
    Object.keys(summaries).forEach(matchId => {
        const match = summaries[matchId];
        const jornada = match.jornada || 'N/D'; 
        
        if (!match.teams || match.teams.length < 2) return;
        
        const local = match.teams.find(t => t.teamIdIntern === match.localId);
        const visitor = match.teams.find(t => t.teamIdIntern === match.visitId);

        if (!local || !visitor) return;
        
        // Puntuación del JSON (original)
        const finalScore = match.score[match.score.length - 1];
        const jsonScoreLocal = parseInt(finalScore.local) || 0; 
        const jsonScoreVisit = parseInt(finalScore.visit) || 0;
        
        // Puntuaciones a usar para GF/GC y G/P/NP (por defecto, las del JSON)
        let scoreForStatsLocal = jsonScoreLocal;
        let scoreForStatsVisit = jsonScoreVisit;
        
        // LÓGICA MINI-BASKET: Usar el marcador del nombre del fichero para GF/GC y G/P/NP
        if (isMiniBasket) {
            const fileScore = getScoreFromFileName(match.fileName); 
            
            if (fileScore) {
                // Sobrescribe GF/GC y la puntuación usada para G/P/NP
                scoreForStatsLocal = fileScore.localScore;
                scoreForStatsVisit = fileScore.visitScore;
            } 
        }
        
        const periodsResult = calculatePeriodsResult(match);
        const localPeriods = periodsResult.periodsWonLocal;
        const visitPeriods = periodsResult.periodsWonVisit;
        
        
        const processMatch = (team, opponent, teamScoreForStats, opponentScoreForStats, teamPeriods, opponentPeriods, isLocal) => {
            const t = processedTeams[team.name]; // Ahora buscamos por el nombre
            
            t.stats.J++;
            t.stats.GF += teamScoreForStats; 
            t.stats.GC += opponentScoreForStats; 
            
            // ASIGNACIÓN CONDICIONAL DE PUNTOS DE CLASIFICACIÓN (Ptos)
            let pointsToAssign = 0;
            
            // 1. ASIGNACIÓN DE PUNTOS DE CLASIFICACIÓN (Ptos)
            if (isMiniBasket) {
                // REGLA MINI-BASKET: 2 pts win / 1 pt loss/tie (en la V2.5 se aplicaba mal el 2/1)
                // Usando la lógica Mini-Basket de periodos (ahora se usa el marcador cerrado)
                if (teamScoreForStats > opponentScoreForStats) {
                    pointsToAssign = 2; // Ganado
                } else {
                    pointsToAssign = 1; // Perdido o Empatado
                }
            } else {
                // Liga Normal (Baloncesto Estándar FCBQ): 2 pts win / 1 pt loss/tie
                pointsToAssign = getNormalLeaguePoints(teamScoreForStats, opponentScoreForStats);
            }
            t.stats.Puntos += pointsToAssign;
            
            let matchResult;
            
            // 2. Determinación de G/P/NP basada en el marcador cerrado
            if (teamScoreForStats > opponentScoreForStats) { 
                t.stats.G++; matchResult = 'Ganado';
            } else if (teamScoreForStats < opponentScoreForStats) {
                t.stats.P++; matchResult = 'Perdido';
            } else {
                t.stats.NP++; matchResult = 'No Perdido';
            }

            t.matches.push({
                jornada: jornada,
                opponentName: opponent.name,
                score: teamScoreForStats, 
                opponentScore: opponentScoreForStats, 
                result: matchResult,
                periodsWon: teamPeriods,
                periodsLost: opponentPeriods,
                isLocal: isLocal
            });
            
            // Registro de puntos acumulados para getPointsEvolutionData
            t.jornadaData[jornada] = { 
                Puntos: t.stats.Puntos, 
                GF: t.stats.GF,
                GC: t.stats.GC
            };

            // --- Lógica de Jugadores (Acceso Directo y Seguridad) ---
            
            // 1. CRÍTICO: Encontrar el objeto del equipo actual dentro del array 'match.teams'.
            const currentTeamData = match.teams.find(mt => mt.teamIdIntern === team.teamIdIntern);

            let teamPlayersData = [];
            
            // 2. Comprobación de seguridad: Aseguramos que 'currentTeamData.players' es un array válido.
            if (currentTeamData && currentTeamData.players && Array.isArray(currentTeamData.players)) {
                 // Acceder a la lista directamente sin filtro
                teamPlayersData = currentTeamData.players; 
            } else {
                // Si no es válido o es undefined, usamos un array vacío y registramos la advertencia.
                console.warn(`[dataProcessor.js] Advertencia: Jugadores no encontrados para el equipo ${team.name} en el JSON: ${match.fileName || 'DESCONOCIDO'}. Usando array vacío.`);
            }
            
            // El resto del código ahora está seguro porque teamPlayersData siempre es un array.
            teamPlayersData.forEach(player => {
                 const key = player.dorsal || player.name; 
                if (!processedTeams[team.name].players[key]) {
                    processedTeams[team.name].players[key] = { 
                        dorsal: player.dorsal, 
                        name: player.name, 
                        stats: { Puntos: 0, PJ: 0, Minutos: 0, shotsOfOneSuccessful: 0, shotsOfOneAttempted: 0, shotsOfTwoSuccessful: 0, shotsOfTwoAttempted: 0, shotsOfThreeSuccessful: 0, shotsOfThreeAttempted: 0, Faltas: 0 }, 
                        matchHistory: [] 
                    };
                }
                const pStats = processedTeams[team.name].players[key].stats;
                const pData = player.data || {};
                if (Object.keys(pData).length === 0 && !player.timePlayed) { return; }
                pStats.PJ++; pStats.Puntos += pData.score || 0; pStats.Minutos += player.timePlayed || 0; pStats.Faltas += pData.faults || 0; 
                pStats.shotsOfOneSuccessful += pData.shotsOfOneSuccessful || 0; pStats.shotsOfOneAttempted += pData.shotsOfOneAttempted || 0; 
                pStats.shotsOfTwoSuccessful += pData.shotsOfTwoSuccessful || 0; pStats.shotsOfTwoAttempted += pData.shotsOfTwoAttempted || 0; 
                pStats.shotsOfThreeSuccessful += pData.shotsOfThreeSuccessful || 0; pStats.shotsOfThreeAttempted += pData.shotsOfThreeAttempted || 0; 
                
                processedTeams[team.name].players[key].matchHistory.push({
                    jornada: jornada, opponentName: opponent.name, teamScore: teamScoreForStats, opponentScore: opponentScoreForStats, result: matchResult, 
                    Puntos: pData.score || 0, Minutos: player.timePlayed || 0, Faltas: pData.faults || 0,
                    shotsOfOneSuccessful: pData.shotsOfOneSuccessful || 0, shotsOfOneAttempted: pData.shotsOfOneAttempted || 0,
                    shotsOfTwoSuccessful: pData.shotsOfTwoSuccessful || 0, shotsOfTwoAttempted: pData.shotsOfTwoAttempted || 0,
                    shotsOfThreeSuccessful: pData.shotsOfThreeSuccessful || 0, shotsOfThreeAttempted: pData.shotsOfThreeAttempted || 0
                });
            });
            // -----------------------------------------------------------------
        };
        
        processMatch(local, visitor, scoreForStatsLocal, scoreForStatsVisit, localPeriods, visitPeriods, true);
        processMatch(visitor, local, scoreForStatsVisit, scoreForStatsLocal, visitPeriods, localPeriods, false);
    });

    const teamNames = Object.keys(processedTeams);
    if (teamNames.length > 0) {
        displayKPIs(); 
        renderClassificationTable(); 
        populateTeamFilterDetail(Object.values(processedTeams)); 
        toggleDashboardView(true);
    }
}


function loadAllMatches() {
    const categoryFolder = categorySelector.value;
    
    if (!categoryFolder || categoryFolder === "") {
        return;
    }

    // CRÍTICO: Obtener la configuración de la categoría seleccionada
    const currentCategory = categoryConfiguration.find(c => c.folder === categoryFolder);
    
    if (!currentCategory || !currentCategory.match_files) {
         console.error(`🔴 ERROR: No se encontró la configuración o la lista de archivos para la categoría: ${categoryFolder}`);
         toggleDashboardView(false);
         return;
    }
    
    // Usamos la lista de archivos específica de la categoría
    const categoryMatchFiles = currentCategory.match_files; 

    allMatchSummaries = {};
    toggleDashboardView(false);

    const fetchPromises = categoryMatchFiles.map(fileName => {
        // RUTA CORREGIDA: Ahora busca dentro de la carpeta 'Partidos'
        const url = `./Partidos/${categoryFolder}/${fileName}`; 
        const matchId = getMatchIdFromFileName(fileName); 
        
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`404: No encontrado (${fileName})`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.jornada && fileName.startsWith('J')) {
                    data.jornada = parseInt(fileName.split('_')[0].replace('J', ''));
                }
                
                // CRÍTICO: Guardar el nombre del archivo para la lógica Mini-Basket
                data.fileName = fileName; 
                
                const finalScore = data.score[data.score.length - 1]; 
                data.finalScoreLocal = parseInt(finalScore.local) || 0;
                data.finalScoreVisit = parseInt(finalScore.visit) || 0;
                
                allMatchSummaries[matchId] = data; 
            })
            .catch(error => {
                console.error(`🔴 Error al cargar ${fileName}: ${error.message}`);
            });
    });

    Promise.all(fetchPromises.map(p => p.catch(e => e))).then(() => {
        const loadedCount = Object.keys(allMatchSummaries).length;
        if (loadedCount > 0) {
            processAllData();
            const evolutionTab = document.querySelector('#main-tabs .tab-button[data-tab="evolution"]');
            if (evolutionTab && evolutionTab.classList.contains('active')) {
                renderPointsEvolutionGraph();
            }
        } else {
            console.error(`🔴 ERROR: No se pudo cargar ningún archivo JSON válido. Revisa los mensajes 404 en la consola...`);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // CRÍTICO: Cargar la configuración antes de asociar el evento 'change'
    loadCategoryConfiguration().then(() => {
        if (categorySelector) {
            categorySelector.addEventListener('change', loadAllMatches);
            if (categorySelector.value) {
                 loadAllMatches();
            }
        }
    });
});

// --- FUNCIONES REINTEGRADAS (para evitar ReferenceError y errores de UI) ---

/**
 * Rellena el selector de equipos y configura el detalle de jugadores.
 */
function populateTeamFilterDetail(teams) {
    const teamFilterSelect = document.getElementById('teamFilterDetail'); 
    
    if (!teamFilterSelect) {
        console.error("No se encontró el elemento #teamFilterDetail.");
        return;
    }

    // 1. Limpiar y añadir opciones
    teamFilterSelect.innerHTML = '<option value="">-- Seleccionar Equipo --</option>';
    
    // Ordenar los equipos alfabéticamente
    teams.sort((a, b) => a.name.localeCompare(b.name));
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.name;
        option.textContent = team.name;
        teamFilterSelect.appendChild(option);
    });

    // 2. Definir el manejador de eventos
    teamFilterSelect.onchange = function() {
        const selectedTeamName = this.value;
        const selectedTeam = teams.find(t => t.name === selectedTeamName);

        if (selectedTeam) {
            renderTeamDetails(selectedTeam);
        } else {
            // Limpiar si se selecciona la opción vacía
            clearTeamDetails();
        }
    };

    // 3. Inicializar el detalle con el primer equipo si existe
    if (teams.length > 0) {
        teamFilterSelect.value = teams[0].name;
        renderTeamDetails(teams[0]);
    }
}

/**
 * Renderiza el detalle del equipo y sus partidos.
 */
function renderTeamDetails(team) {
    const detailName = document.getElementById('teamDetailName'); 
    const detailMatches = document.getElementById('match-list'); 
    const detailPlayers = document.getElementById('player-content'); 

    if (detailName) detailName.textContent = team.name;
    
    // Renderizado de partidos
    if (detailMatches) {
        detailMatches.innerHTML = `
        <h4>Partidos Jugados</h4>
        <table class="match-stats-table">
            <thead>
                <tr>
                    <th>Jornada</th>
                    <th>Oponente</th>
                    <th>Marcador</th>
                    <th>Resultado (Periodos)</th>
                </tr>
            </thead>
            <tbody>
                ${team.matches.map((m, index) => { // Añadimos 'index'
                    const teamNameEncoded = encodeURIComponent(team.name);
                    
                    // Añadimos la función de clic a la fila
                    return `
                    <tr class="match-detail-row" 
                        onclick="showPlayersByMatch('${teamNameEncoded}', ${index})" 
                        style="cursor: pointer;">
                        <td>J${m.jornada}</td>
                        <td>vs ${m.opponentName}</td>
                        <td>${m.score} - ${m.opponentScore}</td>
                        <td>${m.result} (${m.periodsWon}-${m.periodsLost})</td>
                    </tr>
                `;
                }).join('')}
            </tbody>
        </table>
        
        <div id="match-player-detail" style="margin-top: 20px;"></div>`;
    }
    
    // Renderizado de jugadores
    if (detailPlayers && typeof renderPlayerStatsTable !== 'undefined') {
        const playersArray = Object.values(team.players);
        renderPlayerStatsTable(playersArray, detailPlayers);
    } else if (detailPlayers) {
        detailPlayers.innerHTML = '<h4>Estadísticas Individuales</h4><p>La función renderPlayerStatsTable no está definida o los datos no se cargaron correctamente.</p>';
    }
}

/**
 * Limpia el área de detalle del equipo.
 */
function clearTeamDetails() {
    const detailName = document.getElementById('teamDetailName'); 
    const detailMatches = document.getElementById('match-list');
    const detailPlayers = document.getElementById('player-content');

    if (detailName) detailName.textContent = 'Equipo no Seleccionado';
    if (detailMatches) detailMatches.innerHTML = '';
    if (detailPlayers) detailPlayers.innerHTML = '';
}

/**
 * Dibuja la tabla de estadísticas de jugadores.
 * Se añade la funcionalidad de desplegar detalle por partido.
 */
function renderPlayerStatsTable(players, containerElement) {
    if (!containerElement || players.length === 0) {
        containerElement.innerHTML = '<p>No hay datos de jugadores disponibles para este equipo.</p>';
        return;
    }

    const playersArray = players.map(player => ({
        dorsal: player.dorsal || '',
        name: player.name || 'N/D',
        PJ: player.stats.PJ,
        Puntos: player.stats.Puntos,
        Minutos: player.stats.Minutos,
        Faltas: player.stats.Faltas,
        Tiros1C: player.stats.shotsOfOneSuccessful,
        Tiros1I: player.stats.shotsOfOneAttempted,
        Tiros2C: player.stats.shotsOfTwoSuccessful,
        Tiros2I: player.stats.shotsOfTwoAttempted,
        Tiros3C: player.stats.shotsOfThreeSuccessful,
        Tiros3I: player.stats.shotsOfThreeAttempted
    })).sort((a, b) => b.Puntos - a.Puntos); 

    const header = `
        <thead>
            <tr>
                <th>Dorsal</th>
                <th>Nombre</th>
                <th>PJ</th>
                <th>Ptos</th>
                <th>Min</th>
                <th>Faltas</th>
                <th>Tiros 1</th>
                <th>Tiros 2</th>
                <th>Tiros 3</th>
            </tr>
        </thead>
    `;

    // Generar las filas de datos y el placeholder de detalle
    const rows = playersArray.map(p => {
        const playerKey = p.dorsal || p.name; // Clave única
        
        return `
            <tr class="player-summary-row" data-player-key="${playerKey}" onclick="togglePlayerMatchDetails('${playerKey}', this)">
                <td>${p.dorsal}</td>
                <td>${p.name}</td>
                <td>${p.PJ}</td>
                <td>${p.Puntos}</td>
                <td>${formatTime(p.Minutos)}</td>
                <td>${p.Faltas}</td>
                <td>${renderShotEfficiency(p.Tiros1C, p.Tiros1I, 'compact_pct')}</td>
                <td>${renderShotEfficiency(p.Tiros2C, p.Tiros2I, 'successful_only')}</td>
                <td>${renderShotEfficiency(p.Tiros3C, p.Tiros3I, 'successful_only')}</td>
            </tr>
            <tr class="player-detail-row" id="detail-row-${playerKey}" style="display: none;">
                <td colspan="9" class="player-detail-content" style="padding: 0;">
                    </td>
            </tr>
        `;
    }).join('');

    // Insertar la tabla completa
    containerElement.innerHTML = `
        <h4>Estadísticas Agregadas de Jugadores</h4>
        <table class="player-stats-table">
            ${header}
            <tbody>${rows}</tbody>
        </table>
    `;
}


// --- NUEVAS FUNCIONES DE DETALLE POR JUGADOR ---

/**
 * Muestra u oculta la sub-tabla de historial de partidos de un jugador.
 */
function togglePlayerMatchDetails(playerKey, clickedRow) {
    const detailRow = document.getElementById(`detail-row-${playerKey}`);
    const detailContentCell = detailRow.querySelector('.player-detail-content');

    // Toggle visibility
    if (detailRow.style.display === 'none') {
        // Ocultar cualquier otra fila de detalle que esté abierta
        document.querySelectorAll('.player-detail-row').forEach(row => {
            if (row.id !== detailRow.id) {
                row.style.display = 'none';
                // También quitar la clase 'active' de la fila de resumen
                document.querySelector(`[data-player-key="${row.id.replace('detail-row-', '')}"]`).classList.remove('active-detail');
            }
        });

        detailRow.style.display = 'table-row';
        clickedRow.classList.add('active-detail');
        
        // Cargar data y renderizar sub-tabla (solo si no se ha cargado)
        if (detailContentCell.innerHTML.trim() === '') {
            const currentTeamName = document.getElementById('teamFilterDetail').value;
            const team = processedTeams[currentTeamName];
            
            if (team && team.players[playerKey]) {
                const matchHistory = team.players[playerKey].matchHistory.sort((a, b) => parseInt(a.jornada) - parseInt(b.jornada));
                
                const subTableHTML = generateMatchHistoryTable(matchHistory);
                detailContentCell.innerHTML = subTableHTML;
            } else {
                detailContentCell.innerHTML = '<p>No hay historial de partidos disponible.</p>';
            }
        }
    } else {
        // Ocultar la fila de detalle
        detailRow.style.display = 'none';
        clickedRow.classList.remove('active-detail');
    }
}

/**
 * Genera el HTML de la tabla de desglose de partidos.
 */
function generateMatchHistoryTable(matchHistory) {
    
    const header = `
        <thead>
            <tr style="background-color: #f0f0f0; color: var(--primary-color);">
                <th>J</th>
                <th>Oponente</th>
                <th>Resultado</th>
                <th>Ptos</th>
                <th>Min</th>
                <th>Faltas</th>
                <th>Tiros 1</th>
                <th>Tiros 2</th>
                <th>Tiros 3</th>
            </tr>
        </thead>
    `;

    const rows = matchHistory.map(m => `
        <tr>
            <td>J${m.jornada}</td>
            <td>${m.opponentName}</td>
            <td>${m.teamScore} - ${m.opponentScore} (${m.result.substring(0, 1)})</td>
            <td>${m.Puntos}</td>
            <td>${formatTime(m.Minutos)}</td>
            <td>${m.Faltas}</td>
            <td>${renderShotEfficiency(m.shotsOfOneSuccessful, m.shotsOfOneAttempted, 'compact_pct')}</td>
            <td>${renderShotEfficiency(m.shotsOfTwoSuccessful, m.shotsOfTwoAttempted, 'successful_only')}</td>
            <td>${renderShotEfficiency(m.shotsOfThreeSuccessful, m.shotsOfThreeAttempted, 'successful_only')}</td>
        </tr>
    `).join('');

    return `
        <div style="padding: 10px;">
            <table class="match-history-subtable player-stats-table">
                ${header}
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}