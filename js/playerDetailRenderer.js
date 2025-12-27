document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const playerName = decodeURIComponent(urlParams.get('player'));
    const teamName = decodeURIComponent(urlParams.get('category'));

    if (playerName && teamName) {
        displayPlayerDetail(playerName, teamName);
    } else {
        document.querySelector('.player-name').textContent = 'Jugador o Equipo no especificados';
        // Optionally redirect back or show an error
    }
});

async function displayPlayerDetail(playerName, teamNameAsCategoryFolder) {
    try {
        if (!window.categoryConfiguration || window.categoryConfiguration.length === 0) {
            await loadCategoryConfiguration();
        }

        await loadDataForCategory(teamNameAsCategoryFolder);
        
        let player = null;
        let team = null;

        // Iterate through all teams in the processedTeams to find the one containing the player
        for (const tName in window.processedTeams) {
            const currentTeam = window.processedTeams[tName];
            const foundPlayer = Object.values(currentTeam.players).find(p => p.name === playerName);
            if (foundPlayer) {
                player = foundPlayer;
                team = currentTeam; // Store the team object as well
                break;
            }
        }

        if (player && team) {
            document.title = `Detalle de Jugador: ${player.name}`;
            renderTeamHeader(team);
            renderPlayerDetailHeader(player);
            renderPlayerAggregatedKPIs(player);
            renderPlayerEvolutionCharts(player); // Renderizar gráficas
            renderPlayerGameLog(player);
        } else {
            document.querySelector('.player-name').textContent = `Jugador "${playerName}" no encontrado en la categoría "${teamNameAsCategoryFolder}"`;
            document.querySelector('.player-dorsal').textContent = '';
        }
    } catch (error) {
        console.error("Error loading data for player detail:", error);
        document.querySelector('.player-name').textContent = `Error al cargar datos del jugador`;
    }
}

function renderTeamHeader(team) {
    const headerTitle = document.getElementById('team-header-title');
    if (!headerTitle) return;

    const teamName = team.name;
    const logoUrl = TEAM_LOGOS[teamName.toUpperCase().trim()];

    let logoImg = '';
    if (logoUrl) {
        logoImg = `<img src="${logoUrl}" style="height: 40px; margin-right: 15px; border-radius: 50%; background-color: white; padding: 2px;" onerror="this.style.display='none'">`;
    }

    headerTitle.innerHTML = `${logoImg}<span>${teamName}</span>`;
}

function renderPlayerDetailHeader(player) {
    const key = player.name.toUpperCase().trim();
    const fotoUrl = (typeof JUGADOR_FOTOS !== 'undefined' && JUGADOR_FOTOS[key]) || "https://www.w3schools.com/howto/img_avatar.png";

    document.querySelector('.player-photo').src = fotoUrl;
    document.querySelector('.player-name').textContent = player.name;
    document.querySelector('.player-dorsal').textContent = `#${player.dorsal || '??'}`;
}

function renderPlayerAggregatedKPIs(player) {
    const kpiContainer = document.querySelector('.player-kpis');
    let kpisHtml = '';

    const totalMinutes = player.matchHistory.reduce((sum, m) => sum + m.Minutos, 0);
    const totalPoints = player.stats.Puntos;
    const totalGames = player.stats.PJ;

    const ppg = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : 0;
    const ppm = totalMinutes > 0 ? (totalPoints / totalMinutes).toFixed(1) : 0; // Points per minute

    kpisHtml += `
        <div class="kpi-card">
            <span class="value">${player.stats.PJ}</span>
            <span class="label">Partidos Jugados</span>
        </div>
        <div class="kpi-card">
            <span class="value">${player.stats.Puntos}</span>
            <span class="label">Puntos Totales</span>
        </div>
        <div class="kpi-card">
            <span class="value">${ppg}</span>
            <span class="label">Puntos por Partido (PPG)</span>
        </div>
        <div class="kpi-card">
            <span class="value">${ppm}</span>
            <span class="label">Puntos por Minuto (PPM)</span>
        </div>
        <div class="kpi-card">
            <span class="value">${player.stats.Faltas}</span>
            <span class="label">Faltas Totales</span>
        </div>
        <!-- Añadir más KPIs según necesidad -->
    `;
    kpiContainer.innerHTML = `<div class="kpi-container">${kpisHtml}</div>`; // Reusing kpi-container class
}

function renderPlayerGameLog(player) {
    const gameCardsGrid = document.querySelector('.game-cards-grid');
    let cardsHtml = '';

    player.matchHistory.forEach(m => {
        const gamePoints = m.Puntos;
        const gameMinutes = m.Minutos;
        const gamePPM = gameMinutes > 0 ? (gamePoints / gameMinutes).toFixed(1) : 0;
        
        cardsHtml += `
            <div class="game-card card">
                <h4>Jornada ${m.jornada} vs ${m.opponentName}</h4>
                <p>Fecha: ${m.date}</p>
                <p>Resultado: ${m.teamScore}-${m.opponentScore} ${m.teamScore > m.opponentScore ? '(Victoria)' : '(Derrota)'}</p>
                <div class="game-stats">
                    <div class="stat-item"><span class="stat-value">${gamePoints}</span><span class="stat-label">PTS</span></div>
                    <div class="stat-item"><span class="stat-value">${formatTime(gameMinutes)}</span><span class="stat-label">MIN</span></div>
                    <div class="stat-item"><span class="stat-value">${gamePPM}</span><span class="stat-label">PPM</span></div>
                    <!-- Añadir más estadísticas del partido si se desea -->
                    <div class="stat-item"><span class="stat-value">${renderShotEfficiency(m.shotsOfOneSuccessful, m.shotsOfOneAttempted, 'compact_pct')}</span><span class="stat-label">T1%</span></div>
                    <div class="stat-item"><span class="stat-value">${renderShotEfficiency(m.shotsOfTwoSuccessful, m.shotsOfTwoAttempted, 'compact_pct')}</span><span class="stat-label">T2%</span></div>
                    <div class="stat-item"><span class="stat-value">${renderShotEfficiency(m.shotsOfThreeSuccessful, m.shotsOfThreeAttempted, 'compact_pct')}</span><span class="stat-label">T3%</span></div>
                    <div class="stat-item"><span class="stat-value">${m.Faltas}</span><span class="stat-label">FALTAS</span></div>
                </div>
            </div>
        `;
    });
    gameCardsGrid.innerHTML = cardsHtml;
}

function renderPlayerEvolutionCharts(player) {
    const sortedMatchHistory = player.matchHistory.sort((a, b) => parseInt(a.jornada) - parseInt(b.jornada));

    const labels = sortedMatchHistory.map(m => `J${m.jornada} vs ${m.opponentName}`);
    const ppgData = sortedMatchHistory.map(m => m.Puntos);
    const t2PctData = sortedMatchHistory.map(m => m.shotsOfTwoAttempted > 0 ? ((m.shotsOfTwoSuccessful / m.shotsOfTwoAttempted) * 100).toFixed(1) : 0);
    const t3PctData = sortedMatchHistory.map(m => m.shotsOfThreeAttempted > 0 ? ((m.shotsOfThreeSuccessful / m.shotsOfThreeAttempted) * 100).toFixed(1) : 0);
    const reboundsData = sortedMatchHistory.map(m => m.Rebotes || 0); // Asumiendo que Rebotes existe en matchHistory
    const assistsData = sortedMatchHistory.map(m => m.Asistencias || 0); // Asumiendo que Asistencias existe en matchHistory

    // Chart 1: Puntos por Partido (PPG)
    new Chart(document.getElementById('ppgEvolutionChart'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Puntos por Partido (PTS)',
                data: ppgData,
                borderColor: 'rgba(1, 76, 120, 1)', // var(--primary-color)
                backgroundColor: 'rgba(1, 76, 120, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Evolución de Puntos por Partido (PTS)',
                    color: '#333'
                }
            }
        }
    });

    // Chart 2: Eficiencia de Tiro (T2% y T3%)
    new Chart(document.getElementById('efficiencyEvolutionChart'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tiros de 2 Puntos (%)',
                    data: t2PctData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Tiros de 3 Puntos (%)',
                    data: t3PctData,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Evolución de Eficiencia de Tiro (T2% y T3%)',
                    color: '#333'
                }
            }
        }
    });

    // Chart 3: Rebotes y Asistencias (asumiendo que existen en los datos)
    // Se puede añadir si los datos de rebotes y asistencias están disponibles en matchHistory.
    // Para este ejemplo, solo se muestra el esqueleto.
    // if (document.getElementById('reboundsAssistsEvolutionChart')) {
    //     new Chart(document.getElementById('reboundsAssistsEvolutionChart'), {
    //         type: 'bar', // O 'line' si se prefiere
    //         data: {
    //             labels: labels,
    //             datasets: [
    //                 {
    //                     label: 'Rebotes',
    //                     data: reboundsData,
    //                     backgroundColor: 'rgba(255, 159, 64, 0.6)'
    //                 },
    //                 {
    //                     label: 'Asistencias',
    //                     data: assistsData,
    //                     backgroundColor: 'rgba(54, 162, 235, 0.6)'
    //                 }
    //             ]
    //         },
    //         options: {
    //             responsive: true,
    //             maintainAspectRatio: false,
    //             scales: {
    //                 x: { stacked: true },
    //                 y: { stacked: true, beginAtZero: true }
    //             },
    //             plugins: {
    //                 title: {
    //                     display: true,
    //                     text: 'Evolución de Rebotes y Asistencias',
    //                     color: '#333'
    //                 }
            // }
    //     });
    // }
}

/**
 * Navigates back to the main page (index.html), preserving the selected team (category folder).
 */
function goBackToMainPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFolder = urlParams.get('category'); // Retrieve the category folder
    const teamName = urlParams.get('teamName');     // Retrieve the specific team name

    let redirectUrl = `index.html`;
    const params = [];

    if (categoryFolder) {
        params.push(`category=${encodeURIComponent(categoryFolder)}`);
    }
    if (teamName) {
        params.push(`teamName=${encodeURIComponent(teamName)}`);
    }

    if (params.length > 0) {
        redirectUrl += `?${params.join('&')}`;
    }
    
    window.location.href = redirectUrl;
}