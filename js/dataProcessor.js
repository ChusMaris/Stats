// js/dataProcessor.js

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
    if (teamScore > opponentScore) return 2;
    return 1; 
};

/**
 * Calcula la clasificación aplicando el desempate oficial FCBQ (Art. 132).
 * Gestiona empates dobles y múltiples (clasificación particular).
 */
function calculateClassification(summaries) {
    if (Object.keys(window.processedTeams).length === 0) {
         processAllData();
    }
    
    const selector = document.getElementById('categorySelector');
    const currentCategoryFolder = selector ? selector.value : '';
    const currentCategory = window.categoryConfiguration.find(c => c.folder === currentCategoryFolder);
    const isMiniBasket = currentCategory ? currentCategory.is_mini_basket : false;

    let teamsArray = Object.values(window.processedTeams).map(t => ({
        name: t.name,
        J: t.stats.J,
        G: t.stats.G,
        P: t.stats.P,
        NP: t.stats.NP,
        PF: t.stats.GF,
        PC: t.stats.GC,
        diff: t.stats.GF - t.stats.GC,
        Ptos: t.stats.Puntos,
        _matches: t.matches 
    }));

    return teamsArray.sort((a, b) => {
        // 1. Criterio principal: Puntos totales
        if (b.Ptos !== a.Ptos) return b.Ptos - a.Ptos;

        // 2. Desempate Particular (FCBQ)
        // Buscamos todos los equipos empatados a los mismos puntos
        const tiedTeams = teamsArray.filter(t => t.Ptos === a.Ptos).map(t => t.name);

        if (tiedTeams.length > 2) {
            // Empate Múltiple: Clasificación interna entre los implicados
            const getInternal = (name) => {
                let iPtos = 0, iDiff = 0;
                const team = teamsArray.find(t => t.name === name);
                team._matches.forEach(m => {
                    if (tiedTeams.includes(m.opponentName)) {
                        iPtos += (m.result === 'Ganado' ? 2 : 1);
                        iDiff += (m.score - m.opponentScore);
                    }
                });
                return { iPtos, iDiff };
            };

            const statsA = getInternal(a.name);
            const statsB = getInternal(b.name);

            if (statsB.iPtos !== statsA.iPtos) return statsB.iPtos - statsA.iPtos;
            if (statsB.iDiff !== statsA.iDiff) return statsB.iDiff - statsA.iDiff;
        } else {
            // Empate Doble: Enfrentamiento directo
            const matchDirecto = a._matches.find(m => m.opponentName === b.name);
            if (matchDirecto) {
                if (matchDirecto.result === 'Ganado') return -1;
                if (matchDirecto.result === 'Perdido') return 1;
            }
        }

        // 3. Diferencia General (si persiste el empate)
        if (isMiniBasket) {
            if (b.PF !== a.PF) return b.PF - a.PF;
            return a.PC - b.PC;
        } else {
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.PF - a.PF;
        }
    });
}

function getPointsEvolutionData() {
    const data = [];
    const teamNames = Object.keys(window.processedTeams);

    teamNames.forEach(teamName => {
        const team = window.processedTeams[teamName];
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

async function loadCategoryConfiguration() {
    try {
        const response = await fetch('./categories.json');
        if (!response.ok) {
            console.error("No se pudo cargar categories.json.");
            return;
        }
        const config = await response.json();
        window.categoryConfiguration = config.categories || [];
        
        const selector = document.getElementById('categorySelector');
        if (selector) {
            selector.innerHTML = '<option value="">-- Seleccionar --</option>';
            window.categoryConfiguration.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.folder; 
                option.textContent = cat.name; 
                selector.appendChild(option);
            });
        }

    } catch (error) {
        console.error(`🔴 ERROR de configuración: ${error.message}`);
    }
}

/**
 * Carga y procesa todos los datos para una categoría específica.
 * @param {string} folder - La carpeta de la categoría a cargar.
 * @returns {Promise<void>} Una promesa que se resuelve cuando los datos están cargados y procesados.
 */
async function loadDataForCategory(folder) {
    if (!window.categoryConfiguration || window.categoryConfiguration.length === 0) {
        await loadCategoryConfiguration();
    }

    const cat = window.categoryConfiguration.find(c => c.folder === folder);
    if (!cat) {
        console.error(`Categoría "${folder}" no encontrada.`);
        return Promise.reject(`Categoría "${folder}" no encontrada.`);
    }
    
    window.allMatchSummaries = {};
    const promises = cat.match_files.map(fileName => 
        fetch(`./Partidos/${folder}/${fileName}`)
            .then(r => r.json())
            .then(data => {
                data.fileName = fileName; 
                const jornadaPart = fileName.split('_')[0];
                data.jornada = jornadaPart ? jornadaPart.replace('J', '') : 'N/D';
                window.allMatchSummaries[fileName] = data; 
            })
    );
    
    return Promise.all(promises).then(() => {
        processAllData(cat); // Pasar la configuración de la categoría
        window.currentSelectedCategoryFolder = folder; // Actualizar el equipo seleccionado globalmente (desde config.js)
    }).catch(error => {
        console.error(`Error al cargar datos para la categoría "${folder}":`, error);
        throw error;
    });
}

// Modificar processAllData para aceptar la configuración de la categoría.
function processAllData(categoryConfig) {
    window.processedTeams = {}; // Resetear processedTeams para la nueva categoría
    const summaries = window.allMatchSummaries;
    
    const currentCategory = categoryConfig; // Usar la config pasada, no buscar de nuevo en el DOM
    
    if (!currentCategory) {
        if (typeof toggleDashboardView === 'function') toggleDashboardView(false);
        return;
    }
    
    const isMiniBasket = currentCategory.is_mini_basket;

    Object.keys(summaries).forEach(matchId => {
        const match = summaries[matchId];
        const localTeam = match.teams.find(t => t.teamIdIntern === match.localId);
        const visitTeam = match.teams.find(t => t.teamIdIntern === match.visitId);
        
        const localName = localTeam ? localTeam.name : 'Equipo Local Desconocido';
        const visitName = visitTeam ? visitTeam.name : 'Equipo Visitante Desconocido';
        
        [localName, visitName].forEach(name => {
            if (!window.processedTeams[name]) {
                window.processedTeams[name] = {
                    name: name,
                    stats: { J: 0, G: 0, P: 0, NP: 0, GF: 0, GC: 0, Puntos: 0 },
                    matches: [],
                    players: {},
                    jornadaData: {} 
                };
            }
        });
    });

    Object.keys(summaries).forEach(matchId => {
        const match = summaries[matchId];
        const jornada = match.jornada || 'N/D'; 
        
        if (!match.teams || match.teams.length < 2) return;
        
        const local = match.teams.find(t => t.teamIdIntern === match.localId);
        const visitor = match.teams.find(t => t.teamIdIntern === match.visitId);

        if (!local || !visitor) return;
        
        const finalScore = match.score[match.score.length - 1];
        let sL = parseInt(finalScore.local) || 0;
        let sV = parseInt(finalScore.visit) || 0;
        
        if (isMiniBasket && typeof getScoreFromFileName === 'function') {
            const fs = getScoreFromFileName(match.fileName); 
            if (fs) { sL = fs.localScore; sV = fs.visitScore; } 
        }
        
        const periods = calculatePeriodsResult(match);

        const addStats = (team, opponent, score, oppScore, pWon, pLost, isLocal) => {
            const t = window.processedTeams[team.name];
            t.stats.J++; t.stats.GF += score; t.stats.GC += oppScore;
            t.stats.Puntos += (score > oppScore) ? 2 : 1;
            
            let res = score > oppScore ? 'Ganado' : (score < oppScore ? 'Perdido' : 'No Perdido');
            if (res === 'Ganado') t.stats.G++; else if (res === 'Perdido') t.stats.P++; else t.stats.NP++;

            t.matches.push({
                jornada: jornada, opponentName: opponent.name, score, opponentScore: oppScore,
                result: res, periodsWon: pWon, periodsLost: pLost, isLocal
            });
            
            if (team.players) {
                team.players.forEach(player => {
                    const key = player.dorsal || player.name;
                    if (!t.players[key]) {
                        t.players[key] = { 
                            dorsal: player.dorsal, name: player.name, 
                            stats: { Puntos: 0, PJ: 0, Minutos: 0, shotsOfOneSuccessful: 0, shotsOfOneAttempted: 0, shotsOfTwoSuccessful: 0, shotsOfTwoAttempted: 0, shotsOfThreeSuccessful: 0, shotsOfThreeAttempted: 0, Faltas: 0 }, 
                            matchHistory: [] 
                        };
                    }
                    const ps = t.players[key].stats;
                    const pd = player.data || {};
                    if (Object.keys(pd).length === 0 && !player.timePlayed) return;
                    ps.PJ++; ps.Puntos += pd.score || 0; ps.Minutos += player.timePlayed || 0; ps.Faltas += pd.faults || 0;
                    ps.shotsOfOneSuccessful += pd.shotsOfOneSuccessful || 0; ps.shotsOfOneAttempted += pd.shotsOfOneAttempted || 0;
                    ps.shotsOfTwoSuccessful += pd.shotsOfTwoSuccessful || 0; ps.shotsOfTwoAttempted += pd.shotsOfTwoAttempted || 0;
                    ps.shotsOfThreeSuccessful += pd.shotsOfThreeSuccessful || 0; ps.shotsOfThreeAttempted += pd.shotsOfThreeAttempted || 0;
                    
                    t.players[key].matchHistory.push({
                        jornada, opponentName: opponent.name, teamScore: score, opponentScore: oppScore, result: res,
                        Puntos: pd.score || 0, Minutos: player.timePlayed || 0, Faltas: pd.faults || 0,
                        shotsOfOneSuccessful: pd.shotsOfOneSuccessful || 0, shotsOfOneAttempted: pd.shotsOfOneAttempted || 0,
                        shotsOfTwoSuccessful: pd.shotsOfTwoSuccessful || 0, shotsOfTwoAttempted: pd.shotsOfTwoAttempted || 0,
                        shotsOfThreeSuccessful: pd.shotsOfThreeSuccessful || 0, shotsOfThreeAttempted: pd.shotsOfThreeAttempted || 0
                    });
                });
            }
        };
        addStats(local, visitor, sL, sV, periods.periodsWonLocal, periods.periodsWonVisit, true);
        addStats(visitor, local, sV, sL, periods.periodsWonVisit, periods.periodsWonLocal, false);
    });

    if (Object.keys(window.processedTeams).length > 0) {
        // Estas llamadas deben ser condicionales o manejadas por uiRenderer.js
        // para la página principal.
        // if (typeof displayKPIs === 'function') displayKPIs(); 
        // if (typeof renderClassificationTable === 'function') renderClassificationTable(); 
        // populateTeamFilterDetail(Object.values(window.processedTeams)); 
        // if (typeof toggleDashboardView === 'function') toggleDashboardView(true);
    }
}



document.addEventListener('DOMContentLoaded', () => {
    loadCategoryConfiguration().then(() => {
        const selector = document.getElementById('categorySelector');
        const urlParams = new URLSearchParams(window.location.search);
        const urlCategory = urlParams.get('category');
        
        if (selector) selector.addEventListener('change', (event) => {
            const selectedFolder = event.target.value;
            window.currentSelectedCategoryFolder = selectedFolder; // Set current selected team on change
            loadDataForCategory(selectedFolder).then(() => {
                // Lógica de renderizado para index.html después de cargar la categoría
                populateTeamFilterDetail(Object.values(window.processedTeams)); 
                if (typeof displayKPIs === 'function') displayKPIs(); 
                if (typeof renderClassificationTable === 'function') renderClassificationTable(); 
                if (typeof toggleDashboardView === 'function') toggleDashboardView(true);
            }).catch(error => console.error("Error al cargar y renderizar datos:", error));
        });
        
        let initialCategoryFolder = '';
        if (urlCategory) {
            initialCategoryFolder = urlCategory;
            if (selector) selector.value = initialCategoryFolder;
        } else if (selector) {
            initialCategoryFolder = selector.value;
        }
        
        if (!initialCategoryFolder && window.categoryConfiguration.length > 0) {
            initialCategoryFolder = window.categoryConfiguration[0].folder;
            if (selector) selector.value = initialCategoryFolder; // Pre-seleccionar en el UI
        }
        
        if (initialCategoryFolder) {
            window.currentSelectedCategoryFolder = initialCategoryFolder; // Set current selected team for initial load
            loadDataForCategory(initialCategoryFolder).then(() => {
                populateTeamFilterDetail(Object.values(window.processedTeams)); 
                if (typeof displayKPIs === 'function') displayKPIs(); 
                if (typeof renderClassificationTable === 'function') renderClassificationTable(); 
                if (typeof toggleDashboardView === 'function') toggleDashboardView(true);
            }).catch(error => console.error("Error en carga inicial de datos:", error));
        }
    });
});

function populateTeamFilterDetail(teams) {
    console.log("populateTeamFilterDetail called with teams:", teams);
    const select = document.getElementById('teamFilterDetail'); 
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccionar Equipo --</option>';
    teams.sort((a, b) => a.name.localeCompare(b.name)).forEach(team => {
        const option = document.createElement('option');
        option.value = team.name; option.textContent = team.name;
        select.appendChild(option);
    });
    select.onchange = function() {
        const selectedTeam = teams.find(t => t.name === this.value);
        if (selectedTeam) {
            window.currentSelectedTeamName = selectedTeam.name; // Update global on change
            renderTeamDetails(selectedTeam);
        }
    };
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlTeamName = urlParams.get('teamName'); // Get the specific team name from the URL

    if (teams.length > 0) {
        let teamToSelect = null;
        if (urlTeamName) {
            teamToSelect = teams.find(t => t.name === urlTeamName);
        } 
        
        // If no specific team from URL, or if URL team not found, default to the first team
        if (!teamToSelect && teams.length > 0) {
            teamToSelect = teams[0];
        }

        if (teamToSelect) {
            select.value = teamToSelect.name;
            window.currentSelectedTeamName = teamToSelect.name; // Update the global team name
            renderTeamDetails(teamToSelect);
        }
    }
}

/**
 * Actualiza toda la interfaz de detalle cuando se selecciona un equipo.
 * Debe incluirse en js/dataProcessor.js o js/uiRenderer.js según tu estructura.
 */
function renderTeamDetails(team) {
    console.log("renderTeamDetails called with team:", team);
    // 1. Referencias a los contenedores del HTML
    const nameEl = document.getElementById('teamDetailName'); 
    const matchEl = document.getElementById('match-list'); 
    const playerTableEl = document.getElementById('player-content'); 
    const playerCardsEl = document.getElementById('player-cards-container');

    // 2. Actualizar el nombre del equipo en la cabecera del detalle
    if (nameEl) nameEl.textContent = team.name;

    // 3. Renderizar el listado de partidos (Pestaña "Listado de Partidos")
    if (matchEl) {
        matchEl.innerHTML = `
            <h4>Partidos Jugados</h4>
            <table class="match-stats-table">
                <thead>
                    <tr>
                        <th>Jornada</th>
                        <th>Oponente</th>
                        <th>Marcador</th>
                        <th>Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    ${team.matches.sort((a, b) => parseInt(a.jornada) - parseInt(b.jornada)).map((m, index) => `
                    <tr class="match-detail-row" onclick="showPlayersByMatch('${encodeURIComponent(team.name)}', ${index})" style="cursor: pointer;">
                        <td>J${m.jornada}</td>
                        <td>vs ${m.opponentName}</td>
                        <td>${m.score} - ${m.opponentScore}</td>
                        <td>${m.result}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div id="match-player-detail" style="margin-top: 20px;"></div>`;
    }

    // 4. Renderizar la tabla clásica (Pestaña "Estadísticas Agregadas")
    if (playerTableEl && typeof renderPlayerStatsTable !== 'undefined') {
        renderPlayerStatsTable(Object.values(team.players), playerTableEl);
    }

    // 5. Renderizar las tarjetas nuevas (Pestaña "Tarjetas de Jugadores")
    // Esta es la función que añadimos anteriormente en uiRenderer.js
    if (typeof renderPlayerCards === 'function') {
        renderPlayerCards(Object.values(team.players), 'player-cards-container');
    }
}

function renderPlayerStatsTable(players, container) {
    if (!container || players.length === 0) return;
    const rows = players.sort((a, b) => b.stats.Puntos - a.stats.Puntos).map(p => {
        const key = p.dorsal || p.name;
        return `
            <tr class="player-summary-row" data-player-key="${key}" onclick="togglePlayerMatchDetails('${key}', this)">
                <td>${p.dorsal}</td><td>${p.name}</td><td>${p.stats.PJ}</td><td>${p.stats.Puntos}</td><td>${formatTime(p.stats.Minutos)}</td><td>${p.stats.Faltas}</td>
                <td>${renderShotEfficiency(p.stats.shotsOfOneSuccessful, p.stats.shotsOfOneAttempted, 'compact_pct')}</td>
                <td>${renderShotEfficiency(p.stats.shotsOfTwoSuccessful, p.stats.shotsOfTwoAttempted, 'successful_only')}</td>
                <td>${renderShotEfficiency(p.stats.shotsOfThreeSuccessful, p.stats.shotsOfThreeAttempted, 'successful_only')}</td>
            </tr>
            <tr class="player-detail-row" id="detail-row-${key}" style="display: none;"><td colspan="9" class="player-detail-content" style="padding: 0;"></td></tr>`;
    }).join('');
    container.innerHTML = `<h4>Estadísticas Agregadas</h4><table class="player-stats-table"><thead><tr><th>#</th><th>Nombre</th><th>PJ</th><th>Pts</th><th>Min</th><th>F</th><th>T1</th><th>T2</th><th>T3</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function togglePlayerMatchDetails(playerKey, clickedRow) {
    const detailRow = document.getElementById(`detail-row-${playerKey}`);
    const cell = detailRow.querySelector('.player-detail-content');
    if (detailRow.style.display === 'none') {
        detailRow.style.display = 'table-row';
        if (cell.innerHTML === '') {
            const team = window.processedTeams[document.getElementById('teamFilterDetail').value];
            if (team && team.players[playerKey]) {
                const history = team.players[playerKey].matchHistory.sort((a, b) => parseInt(a.jornada) - parseInt(b.jornada));
                cell.innerHTML = generateMatchHistoryTable(history);
            }
        }
    } else {
        detailRow.style.display = 'none';
    }
}

function generateMatchHistoryTable(matchHistory) {
    const header = `<thead><tr style="background-color: #f0f0f0;"><th>J</th><th>Oponente</th><th>Resultado</th><th>Ptos</th><th>Min</th><th>Faltas</th><th>T1</th><th>T2</th><th>T3</th></tr></thead>`;
    const rows = matchHistory.map(m => `
        <tr><td>J${m.jornada}</td><td>${m.opponentName}</td><td>${m.teamScore}-${m.opponentScore}</td><td>${m.Puntos}</td><td>${formatTime(m.Minutos)}</td><td>${m.Faltas}</td><td>${renderShotEfficiency(m.shotsOfOneSuccessful, m.shotsOfOneAttempted, 'compact_pct')}</td><td>${renderShotEfficiency(m.shotsOfTwoSuccessful, m.shotsOfTwoAttempted, 'successful_only')}</td><td>${renderShotEfficiency(m.shotsOfThreeSuccessful, m.shotsOfThreeAttempted, 'successful_only')}</td></tr>
    `).join('');
    return `<div style="padding: 10px;"><table class="match-history-subtable player-stats-table">${header}<tbody>${rows}</tbody></table></div>`;
}