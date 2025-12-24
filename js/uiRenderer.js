// js/uiRenderer.js

// Depende de: config.js, utils.js, dataProcessor.js

let pfChart = null; // Para almacenar la instancia del gráfico

function toggleDashboardView(show) {
    document.getElementById('dashboard-content').style.display = show ? 'block' : 'none'; 
}

function displayKPIs() {
    const totalMatches = Object.keys(allMatchSummaries).length;
    const totalTeams = Object.keys(processedTeams).length;

    let totalGF = 0;
    let totalGC = 0;
    Object.values(processedTeams).forEach(t => {
        totalGF += t.stats.GF;
        totalGC += t.stats.GC;
    });
    
    const avgGFPerMatch = totalMatches > 0 ? (totalGF + totalGC) / (totalMatches * 2) : 0; 
    
    const kpis = [
        { label: "Partidos Procesados", value: totalMatches },
        { label: "Equipos", value: totalTeams },
        { label: "Puntos Totales (GF+GC)", value: totalGF + totalGC },
        { label: "Media Ptos/Partido", value: avgGFPerMatch.toFixed(1) }
    ];

    const kpiHtml = kpis.map(k => `
        <div class="kpi-card">
            <div class="value">${k.value}</div>
            <div class="label">${k.label}</div>
        </div>
    `).join('');

    document.getElementById('kpi-container').innerHTML = kpiHtml;
}

function renderClassificationTable() {
    const list = calculateClassification(allMatchSummaries);

    let html = `
        <table class="stats-table" id="classificationTable">
            <thead>
                <tr>
                    <th style="text-align: left;">Equipo</th>
                    <th data-key="J" data-type="numeric">J <span class="sort-indicator"></span></th>
                    <th data-key="G" data-type="numeric">G <span class="sort-indicator"></span></th>
                    <th data-key="P" data-type="numeric">P <span class="sort-indicator"></span></th>
                    <th data-key="NP" data-type="numeric">NP <span class="sort-indicator"></span></th>
                    <th data-key="PF" data-type="numeric">PF <span class="sort-indicator"></span></th>
                    <th data-key="PC" data-type="numeric">PC <span class="sort-indicator"></span></th>
                    <th data-key="diff" data-type="numeric">DIF <span class="sort-indicator"></span></th>
                    <th data-key="Ptos" data-type="numeric" class="sort-desc">Ptos <span class="sort-indicator"></span></th>
                </tr>
            </thead>
            <tbody>
    `;

    list.forEach((t, index) => {
        const diffStyle = t.diff >= 0 ? 'color: var(--success-color);' : 'color: var(--fail-color);';
        html += `
            <tr>
                <td style="text-align: left;">${index + 1}. ${t.name}</td>
                <td>${t.J}</td>
                <td>${t.G}</td>
                <td>${t.P}</td>
                <td>${t.NP}</td>
                <td>${t.PF}</td>
                <td>${t.PC}</td>
                <td style="${diffStyle}">${t.diff}</td>
                <td><strong>${t.Ptos}</strong></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById('classification-content').innerHTML = html;
    
    makeTableSortable('classificationTable', list.map(item => ({...item, name: item.name, diff: item.diff, Ptos: item.Ptos})));
}

function renderPointsEvolutionGraph() {
    if (typeof Chart === 'undefined') {
        console.error("Chart.js no está cargado.");
        return;
    }

    const evolutionData = getPointsEvolutionData(); 
    const ctx = document.getElementById('pfEvolutionChart');
    
    if (!ctx) {
        console.error("No se encontró el elemento canvas con ID 'pfEvolutionChart'.");
        return;
    }
    
    if (pfChart) {
        pfChart.destroy();
    }
    
    if (evolutionData.length === 0) {
        console.warn("No hay datos válidos para la evolución de puntos.");
        return; 
    }

    const datasets = evolutionData.map((team, index) => {
        const colors = [
            '#3f51b5', '#ff9800', '#4caf50', '#f44336', '#9c27b0', '#00bcd4', 
            '#8bc34a', '#ffeb3b', '#607d8b', '#795548', '#e91e63', '#009688'
        ];
        const color = colors[index % colors.length];
        
        return {
            label: team.teamName, 
            data: team.data, 
            fill: false,
            borderColor: color,
            backgroundColor: color,
            tension: 0.1, 
            pointRadius: 5
        };
    });

    pfChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Jornada'
                    },
                    ticks: {
                        stepSize: 1, 
                        callback: function(value) {
                            if (value === 0) return 'Inicio';
                            return value;
                        }
                    },
                    min: 0 
                },
                y: {
                    title: {
                        display: true,
                        text: 'Puntos a Favor (Acumulado)'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Evolución de Puntos a Favor (PF)'
                }
            }
        }
    });
}


function populateTeamFilter(teamNames) {
    const select = document.getElementById('teamFilterDetail');
    select.innerHTML = '';
    
    const sortedNames = Array.from(teamNames).sort();

    sortedNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });

    if (sortedNames.length > 0) {
        currentSelectedTeam = sortedNames[0];
        // Nota: 'detail-container' no existe, usaremos el card contenedor de 'Detalle de Equipo y Jugadores'
        // document.getElementById('detail-container').style.display = 'block'; 
        
        select.removeEventListener('change', handleTeamFilterChange); 
        select.addEventListener('change', handleTeamFilterChange);
        displayPlayerAggregateStats();
        displayMatchList();
    }
}

function handleTeamFilterChange(e) {
    currentSelectedTeam = e.target.value;
    const activeTab = document.querySelector('#detail-tabs .tab-button.active').getAttribute('data-tab');
    if (activeTab === 'aggregated') {
        displayPlayerAggregateStats();
    } else if (activeTab === 'matches') {
        displayMatchList();
    }
    document.getElementById('match-player-detail').innerHTML = '';
}

function displayPlayerAggregateStats() {
    const teamName = currentSelectedTeam;
    const team = processedTeams[teamName];
    
    if (!team) return;

    const playersArray = Object.values(team.players).map(p => {
        const minTotal = p.stats.Minutos;
        const pj = p.stats.PJ;
        const ppm = pj > 0 ? (p.stats.Puntos / pj).toFixed(2) : '0.00'; 
        const avgMin = pj > 0 ? (minTotal / pj).toFixed(0) : '0';
        
        const tiros1Ratio = (p.stats.shotsOfOneAttempted === 0) ? 0 : (p.stats.shotsOfOneSuccessful / p.stats.shotsOfOneAttempted);
        const tiros2Ratio = (p.stats.shotsOfTwoAttempted === 0) ? 0 : (p.stats.shotsOfTwoSuccessful / p.stats.shotsOfTwoAttempted); 
        const tiros3Ratio = (p.stats.shotsOfThreeAttempted === 0) ? 0 : (p.stats.shotsOfThreeSuccessful / p.stats.shotsOfThreeAttempted);
        
        return {
            dorsal: p.dorsal, Jugador: p.name, PJ: pj, Puntos: p.stats.Puntos, PPM: parseFloat(ppm), 
            'Tiempo (Total)': formatTime(minTotal), 'Min (Avg)': avgMin, 
            'Tiros 1 (A/I)': renderShotEfficiency(p.stats.shotsOfOneSuccessful, p.stats.shotsOfOneAttempted),
            'Tiros 2': renderShotEfficiency(p.stats.shotsOfTwoSuccessful, p.stats.shotsOfTwoAttempted, 'successful_only'),
            'Tiros 3': renderShotEfficiency(p.stats.shotsOfThreeSuccessful, p.stats.shotsOfThreeAttempted, 'successful_only'),
            Faltas: p.stats.Faltas, 'T1_Ratio': tiros1Ratio, 'T2_Ratio': tiros2Ratio, 'T3_Ratio': tiros3Ratio, 'Minutos_Total': minTotal 
        };
    });


    let html = `
        <table class="stats-table" id="playerStatsTable">
            <thead>
                <tr>
                    <th data-key="dorsal" data-type="numeric" style="text-align: right;">Dorsal</th>
                    <th data-key="Jugador" data-type="text" style="text-align: left;">Jugador</th>
                    <th data-key="PJ" data-type="numeric">PJ <span class="sort-indicator"></span></th>
                    <th data-key="Puntos" data-type="numeric" class="sort-desc">Puntos <span class="sort-indicator"></span></th>
                    <th data-key="PPM" data-type="numeric">PPM <span class="sort-indicator"></span></th>
                    <th data-key="Minutos_Total" data-type="float">Tiempo (Total) <span class="sort-indicator"></span></th>
                    <th data-key="Min (Avg)" data-type="numeric">Min (Avg) <span class="sort-indicator"></span></th>
                    <th data-key="T1_Ratio" data-type="ratio">Tiros 1 (A/I) <span class="sort-indicator"></span></th>
                    <th data-key="T2_Ratio" data-type="ratio">T2 <span class="sort-indicator"></span></th> 
                    <th data-key="T3_Ratio" data-type="ratio">T3 <span class="sort-indicator"></span></th> 
                    <th data-key="Faltas" data-type="numeric">Faltas <span class="sort-indicator"></span></th>
                </tr>
            </thead>
            <tbody>
    `;

    playersArray.sort(compareValues('Puntos', 'desc', 'numeric')); 
    const COL_COUNT = 11;

    playersArray.forEach(d => {
        html += `
            <tr class="player-row" data-player-name="${d.Jugador}" onclick="togglePlayerMatchDetail(event, '${d.Jugador}', this)">
                <td style="text-align: right;">${d.dorsal || '-'}</td>
                <td style="text-align: left;">${d.Jugador}</td>
                <td>${d.PJ}</td>
                <td>${d.Puntos}</td>
                <td>${d.PPM.toFixed(2)}</td>
                <td>${d['Tiempo (Total)']}</td>
                <td>${d['Min (Avg)']}</td>
                <td>${d['Tiros 1 (A/I)']}</td>
                <td>${d['Tiros 2']}</td>
                <td>${d['Tiros 3']}</td>
                <td>${d.Faltas}</td>
            </tr>
            <tr id="detail-row-${d.Jugador}" class="match-detail-row" style="display: none;">
                <td colspan="${COL_COUNT}" style="padding: 0;"></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById('player-content').innerHTML = html;
    
    makeTableSortable('playerStatsTable', playersArray);
} 

function togglePlayerMatchDetail(event, playerName, clickedRow) {
    event.stopPropagation();
    
    const detailRowId = `detail-row-${playerName}`;
    const detailRow = document.getElementById(detailRowId);
    
    if (detailRow && clickedRow.classList.contains('expanded')) {
        detailRow.style.display = 'none';
        clickedRow.classList.remove('expanded');
        return;
    }
    
    document.querySelectorAll('.match-detail-row').forEach(row => {
        if (row.id !== detailRowId) {
            row.style.display = 'none';
        }
    });
    document.querySelectorAll('.player-row').forEach(row => {
        row.classList.remove('expanded');
    });

    const team = processedTeams[currentSelectedTeam];
    const player = Object.values(team.players).find(p => p.name === playerName);
    
    if (!player || !player.matchHistory || player.matchHistory.length === 0) {
        detailRow.querySelector('td').innerHTML = '<p class="warning" style="margin: 0; padding: 10px;">No hay desglose de partidos disponible para este jugador.</p>';
        detailRow.style.display = 'table-row';
        clickedRow.classList.add('expanded');
        return;
    }
    
    let subgridHtml = `
        <div class="subgrid-container card">
            <h4>Desglose por Partido</h4>
            <table class="subgrid-table stats-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">Jornada</th>
                        <th style="width: 30%; text-align: left;">Oponente (Resultado)</th>
                        <th>Ptos</th>
                        <th>Tiempo (HH:MM)</th>
                        <th>T1 (A/I)</th>
                        <th>T2</th> 
                        <th>T3</th> 
                        <th>Faltas</th>
                    </tr>
                </thead>
                <tbody>
    `;

    player.matchHistory.sort((a, b) => (a.jornada || 0) - (b.jornada || 0));
    
    player.matchHistory.forEach(match => {
        const d = match;
        const resultText = d.result || 'NP'; 
        const t1HTML = renderShotEfficiency(d.shotsOfOneSuccessful || 0, d.shotsOfOneAttempted || 0) ;
        const t2HTML = renderShotEfficiency(d.shotsOfTwoSuccessful || 0, d.shotsOfTwoAttempted || 0, 'successful_only');
        const t3HTML = renderShotEfficiency(d.shotsOfThreeSuccessful || 0, d.shotsOfThreeAttempted || 0, 'successful_only');
        const scoreDisplay = `${d.teamScore || 0}-${d.opponentScore || 0}`;
        const resultClass = resultText.includes('Ganado') ? 'color: var(--success-color);' : (resultText.includes('Perdido') ? 'color: var(--fail-color);' : 'color: var(--warning-color);');

        subgridHtml += `
            <tr>
                <td>${d.jornada || '-'}</td>
                <td style="text-align: left;">vs ${d.opponentName || 'N/D'} <span style="${resultClass} font-weight: bold;">(${scoreDisplay})</span></td>
                <td><strong>${d.Puntos || 0}</strong></td> 
                <td>${formatTime(d.Minutos || 0)}</td>
                <td>${t1HTML}</td>
                <td>${t2HTML}</td>
                <td>${t3HTML}</td>
                <td>${d.Faltas || 0}</td>
            </tr>
        `;
    });

    subgridHtml += `
                </tbody>
            </table>
        </div>
    `;

    detailRow.querySelector('td').innerHTML = subgridHtml;
    detailRow.style.display = 'table-row';
    clickedRow.classList.add('expanded');
}


function makeTableSortable(tableId, dataArray) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const isClassification = tableId === 'classificationTable'; 
    
    const headers = table.querySelectorAll('th[data-key]');
    const tbody = table.querySelector('tbody');

    headers.forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            const key = header.getAttribute('data-key');
            const type = header.getAttribute('data-type') || 'numeric';
            let order = header.classList.contains('sort-asc') ? 'desc' : 'asc';
            
            headers.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });

            header.classList.add(order === 'asc' ? 'sort-asc' : 'sort-desc');

            dataArray.sort(compareValues(key, order, type)); 
            
            const fragment = document.createDocumentFragment();

            if (isClassification) {
                tbody.innerHTML = '';
                dataArray.forEach((d, index) => {
                    const row = tbody.insertRow();
                    const diffStyle = d.diff >= 0 ? 'color: var(--success-color);' : 'color: var(--fail-color);';
                    row.insertCell().innerHTML = `${index + 1}. ${d.name}`; row.cells[0].style.textAlign = 'left';
                    row.insertCell().textContent = d.J;
                    row.insertCell().textContent = d.G;
                    row.insertCell().textContent = d.P;
                    row.insertCell().textContent = d.NP;
                    row.insertCell().textContent = d.PF;
                    row.insertCell().textContent = d.PC;
                    row.insertCell().textContent = d.diff; row.cells[7].style = diffStyle;
                    row.insertCell().innerHTML = `<strong>${d.Ptos}</strong>`;
                });
            } else { 
                
                document.querySelectorAll('.match-detail-row').forEach(row => row.style.display = 'none');
                document.querySelectorAll('.player-row').forEach(row => row.classList.remove('expanded'));

                dataArray.forEach(d => {
                    const playerName = d.Jugador;
                    const playerRow = tbody.querySelector(`.player-row[data-player-name="${playerName}"]`);
                    const detailRow = tbody.querySelector(`#detail-row-${playerName}`);
                    
                    if (playerRow) {
                        fragment.appendChild(playerRow);
                    }
                    if (detailRow) {
                        fragment.appendChild(detailRow);
                    }
                });
                
                tbody.innerHTML = '';
                tbody.appendChild(fragment);
            }
        });
    });
}


function displayMatchList() {
    const team = processedTeams[currentSelectedTeam];
    if (!team) return;

    let html = '<div class="card" style="padding: 10px;">';
    team.matches.sort((a, b) => a.jornada - b.jornada).forEach(m => {
        const resultClass = m.result.includes('Ganado') ? 'color: var(--success-color);' : (m.result.includes('Perdido') ? 'color: var(--fail-color);' : 'color: var(--warning-color);');
        const matchId = `${currentSelectedTeam}_${m.jornada}`;

        html += `
            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee;">
                <span>Jornada ${m.jornada}: vs ${m.opponentName} 
                    <span style="${resultClass} font-weight: bold;">(${m.score}-${m.opponentScore})</span>
                </span>
                <button onclick="displayMatchPlayerStats('${matchId}', ${m.jornada})" class="btn-sm">Ver Detalle</button>
            </div>
        `;
    });
    html += '</div>';
    document.getElementById('match-list').innerHTML = html;
    document.getElementById('match-player-detail').innerHTML = '';
}

function displayMatchPlayerStats(matchId, jornada) {
    const team = processedTeams[currentSelectedTeam];
    if (!team) return;

    const matchKey = Object.keys(allMatchSummaries).find(k => k.startsWith(`J${jornada}_P`));
    if (!matchKey) {
        document.getElementById('match-player-detail').innerHTML = `<p class="warning">No se encontró el archivo JSON para la Jornada ${jornada}.</p>`;
        return;
    }

    const fullMatchData = allMatchSummaries[matchKey];
    const currentTeamData = fullMatchData.teams.find(t => t.name === currentSelectedTeam);
    
    if (!currentTeamData) {
        document.getElementById('match-player-detail').innerHTML = `<p class="warning">No se encontraron datos de jugadores para este equipo en el JSON de la Jornada ${jornada}.</p>`;
        return;
    }
    
    let html = `
        <h3>Detalle de Jugadores - Jornada ${jornada}</h3>
        <table class="stats-table">
            <thead>
                <tr>
                    <th style="text-align: right;">Dorsal</th>
                    <th style="text-align: left;">Jugador</th>
                    <th>Puntos</th>
                    <th>Minutos</th>
                    <th>Tiros 1</th>
                    <th>Tiros 2</th>
                    <th>Tiros 3</th>
                    <th>Faltas</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentTeamData.players.forEach(p => {
        const d = p.data || {};
        const t1HTML = renderShotEfficiency(d.shotsOfOneSuccessful || 0, d.shotsOfOneAttempted || 0) ;
        const t2HTML = renderShotEfficiency(d.shotsOfTwoSuccessful || 0, d.shotsOfTwoAttempted || 0);
        const t3HTML = renderShotEfficiency(d.shotsOfThreeSuccessful || 0, d.shotsOfThreeAttempted || 0);
        
        html += `<tr>
            <td style="font-weight: bold; text-align: right;">${p.dorsal || '-'}</td>
            <td style="text-align: left;">${p.name || 'N/D'}</td>
            <td><strong>${d.score || 0}</strong></td>
            <td>${formatTime(p.timePlayed || 0)}</td>
            <td>${t1HTML}</td>
            <td>${t2HTML}</td>
            <td>${t3HTML}</td>
            <td>${d.faults || 0}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('match-player-detail').innerHTML = html;
}


// --- SETUP DE EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    // Pestañas PRINCIPALES (Clasificación/Evolución)
    const mainTabs = document.querySelectorAll('#main-tabs .tab-button');
    mainTabs.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            mainTabs.forEach(btn => btn.classList.remove('active'));
            document.getElementById('tab-content-classification').style.display = 'none';
            document.getElementById('tab-content-evolution').style.display = 'none';

            button.classList.add('active');
            document.getElementById(`tab-content-${targetTab}`).style.display = 'block';

            if (targetTab === 'evolution') {
                renderPointsEvolutionGraph(); 
            } else if (targetTab === 'classification') {
                renderClassificationTable(); 
            }
        });
    });

    // Pestañas de detalle (aggregated/matches)
    const detailTabs = document.querySelectorAll('#detail-tabs .tab-button');
    detailTabs.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            detailTabs.forEach(btn => btn.classList.remove('active'));
            document.getElementById('tab-content-aggregated').style.display = 'none';
            document.getElementById('tab-content-matches').style.display = 'none';

            button.classList.add('active');
            document.getElementById(`tab-content-${targetTab}`).style.display = 'block';

            if (targetTab === 'aggregated') {
                displayPlayerAggregateStats(); 
            } else if (targetTab === 'matches') {
                displayMatchList();
            }
            document.getElementById('match-player-detail').innerHTML = '';
        });
    });
    
    // Si hay datos cargados, forzamos la renderización inicial
    if (Object.keys(allMatchSummaries).length > 0) {
        renderClassificationTable();
    }
});

/**
 * Muestra el detalle de estadísticas individuales de los jugadores para un partido específico.
 * @param {string} teamName - Nombre del equipo seleccionado.
 * @param {number} matchIndex - Índice del partido dentro del array team.matches.
 */
function showPlayersByMatch(teamNameEncoded, matchIndex) {
    // 1. Decodificar nombre y encontrar el equipo
    const teamName = decodeURIComponent(teamNameEncoded);
    const team = processedTeams[teamName];
    const detailContainer = document.getElementById('match-player-detail');

    if (!team || !detailContainer) {
        console.error("No se pudo encontrar el equipo o el contenedor de detalle.");
        if (detailContainer) detailContainer.innerHTML = '<p class="warning-message">Error: Datos no disponibles.</p>';
        return;
    }

    const match = team.matches[matchIndex];
    if (!match) {
        detailContainer.innerHTML = '<p class="warning-message">Error: Partido no encontrado.</p>';
        return;
    }

    // 2. Obtener el historial de jugadores para ese partido
    const playersStats = [];
    
    // Iterar sobre todos los jugadores del equipo
    Object.values(team.players).forEach(player => {
        const playerMatchStat = player.matchHistory.find(
            historyEntry => 
                historyEntry.jornada === match.jornada && 
                historyEntry.opponentName === match.opponentName
        );
        
        if (playerMatchStat) {
            // Solo añadir jugadores que tienen datos en este partido
            playersStats.push({
                dorsal: player.dorsal,
                name: player.name,
                ...playerMatchStat
            });
        }
    });

    // 3. Renderizar el título y la tabla
    
    // Usamos el mismo motor de tabla que ya tienes
    const statsTableHTML = generatePlayerMatchDetailTable(playersStats, match); 
    
    detailContainer.innerHTML = `
        <h4 style="margin-bottom: 5px;">Detalle de Jugadores - Jornada ${match.jornada} vs ${match.opponentName}</h4>
        <p style="font-size: 0.9em; margin-top: 0;">Resultado: ${match.score} - ${match.opponentScore}</p>
        ${statsTableHTML}
    `;

    // 4. Recopilar y Renderizar el Mapa de Tiros (SHOT CHART)
    const successfulShots = getSuccessfulShotsForMatch(team, match);
    renderShotChart(successfulShots, 'match-player-detail'); // Llamada a la nueva función
    
    // 5. Opcional: Resaltar la fila activa
    document.querySelectorAll('.match-detail-row').forEach(row => row.classList.remove('active'));
    // El índice + 2 compensa el <thead> y el índice base 0
    const matchRows = document.querySelectorAll('#match-list .match-detail-row');
    if (matchRows[matchIndex]) {
        matchRows[matchIndex].classList.add('active'); 
    }
    
    // Opcional: Resaltar la fila activa
    document.querySelectorAll('.match-detail-row').forEach(row => row.classList.remove('active'));
    document.querySelector(`.match-detail-row:nth-child(${matchIndex + 2})`).classList.add('active'); // +2 por thead y 1-based index
}

/**
 * Genera la tabla HTML para el detalle de jugadores de un partido.
 */
function generatePlayerMatchDetailTable(players, match) {
    if (players.length === 0) {
        return '<p class="warning-message">No se encontraron estadísticas individuales de jugadores para este partido.</p>';
    }
    
    // Reutilizamos el formato de tabla ya existente
    const header = `
        <thead>
            <tr>
                <th>Dorsal</th>
                <th>Nombre</th>
                <th>Ptos</th>
                <th>Min</th>
                <th>Faltas</th>
                <th>Tiros 1</th>
                <th>Tiros 2</th>
                <th>Tiros 3</th>
            </tr>
        </thead>
    `;

    const rows = players.sort((a, b) => (b.Puntos || 0) - (a.Puntos || 0)).map(p => `
        <tr>
            <td>${p.dorsal || 'N/D'}</td>
            <td>${p.name || 'N/D'}</td>
            <td>${p.Puntos || 0}</td>
            <td>${formatTime(p.Minutos || 0)}</td>
            <td>${p.Faltas || 0}</td>
            <td>${renderShotEfficiency(p.shotsOfOneSuccessful || 0, p.shotsOfOneAttempted || 0, 'compact_pct')}</td>
            <td>${renderShotEfficiency(p.shotsOfTwoSuccessful || 0, p.shotsOfTwoAttempted || 0, 'successful_only')}</td>
            <td>${renderShotEfficiency(p.shotsOfThreeSuccessful || 0, p.shotsOfThreeAttempted || 0, 'successful_only')}</td>
        </tr>
    `).join('');

    return `
        <table class="player-stats-table">
            ${header}
            <tbody>${rows}</tbody>
        </table>
    `;
}

/**
 * Recopila todos los puntos de canasta exitosos de 2 puntos de todos los jugadores 
 * para un partido específico.
 * @param {object} team - Objeto del equipo seleccionado (processedTeams[teamName]).
 * @param {object} match - Objeto del partido seleccionado (team.matches[matchIndex]).
 * @returns {Array<object>} Lista de coordenadas normalizadas de canastas de 2 puntos.
 */
function getSuccessfulShotsForMatch(team, match) {
    const allShots = [];

    // Recorremos el listado de todos los jugadores del equipo
    Object.values(team.players).forEach(player => {
        // Buscamos el registro del partido dentro del historial de cada jugador
        const historyEntry = player.matchHistory.find(
            historyEntry => 
                historyEntry.jornada === match.jornada && 
                historyEntry.opponentName === match.opponentName
        );

        if (historyEntry) {
            // Buscamos el JSON original del partido usando el nombre del oponente y la jornada
            const originalMatch = Object.values(allMatchSummaries).find(m => 
                 m.jornada === historyEntry.jornada && 
                 (m.teams.some(t => t.name === team.name) && m.teams.some(t => t.name === historyEntry.opponentName))
            );
            
            if (originalMatch) {
                // Iteramos sobre los datos del JSON original para encontrar las coordenadas
                const teamData = originalMatch.teams.find(t => t.name === team.name);

                if (teamData && teamData.players && Array.isArray(teamData.players)) {
                     const originalPlayer = teamData.players.find(p => 
                        (p.dorsal === player.dorsal || p.name === player.name)
                    );
                    
                    // Aquí accedemos al array de coordenadas de las canastas de 2
                    const shots = originalPlayer?.data?.shootingOfTwoSuccessfulPoint || [];
                    
                    shots.forEach(shot => {
                         // Asumimos que la información relevante es xnormalize y ynormilize
                         if (shot.xnormalize && shot.ynormilize) {
                             allShots.push({
                                 x: shot.xnormalize, // Valor entre 0 y 1000
                                 y: shot.ynormilize, // Valor entre 0 y 1000
                                 dorsal: player.dorsal,
                                 name: player.name
                             });
                         }
                    });
                }
            }
        }
    });

    return allShots;
}

/**
 * Renderiza el mapa de tiros (Shot Chart) para un partido específico.
 * @param {Array<object>} shots - Lista de coordenadas de canastas exitosas.
 * @param {string} containerId - ID del contenedor donde se insertará el gráfico.
 */
function renderShotChart(shots, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Asumimos que la imagen de la media cancha está en esta ruta:
    const courtImagePath = './img/half_court.png'; 
    
    // Contenedor principal para la cancha (necesita position: relative)
    let shotChartHTML = `
        <div class="shot-chart-container">
            <img src="${courtImagePath}" alt="Media Cancha de Baloncesto" class="court-image">
    `;

    // Mapeamos los puntos de tiro
    shots.forEach((shot, index) => {
        // Usamos las coordenadas normalizadas (0-1000) para posicionar el punto
        // y se escalarán con el contenedor gracias a CSS.
        
        // La cancha de baloncesto se representa típicamente con Y arriba y X a la derecha.
        // Asumiendo que 0,0 es la esquina superior izquierda.
        
        // Convertimos el valor normalizado a porcentaje para el CSS.
        const leftPercent = (shot.x / 10).toFixed(2); 
        const topPercent = (shot.y / 10).toFixed(2); 

        shotChartHTML += `
            <div class="shot-marker successful" 
                 style="left: ${leftPercent}%; top: ${topPercent}%;"
                 title="Canasta de 2 - ${shot.name} (${shot.dorsal || 'N/D'})">
            </div>
        `;
    });

    shotChartHTML += `</div>`;
    
    if (shots.length === 0) {
        shotChartHTML = `<p class="warning-message">No se registraron canastas de 2 puntos en este partido.</p>`;
    }
    
    container.innerHTML += `<h4 style="margin-top: 20px;">Mapa de Tiros (Canastas de 2 Puntos)</h4>${shotChartHTML}`;
}
