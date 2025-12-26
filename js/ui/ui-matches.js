// js/ui/ui-matches.js
function displayMatchList() {
    const team = processedTeams[currentSelectedTeam];
    if (!team) return;
    let html = '<div class="card" style="padding: 10px;">';
    team.matches.sort((a, b) => a.jornada - b.jornada).forEach((m, idx) => {
        const resultClass = m.result.includes('Ganado') ? 'color: var(--success-color);' : 'color: var(--fail-color);';
        html += `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee;">
            <span>Jornada ${m.jornada}: vs ${m.opponentName} <b style="${resultClass}">(${m.score}-${m.opponentScore})</b></span>
            <button onclick="showPlayersByMatch('${encodeURIComponent(team.name)}', ${idx})" class="btn-sm">Ver Detalle</button>
        </div>`;
    });
    document.getElementById('match-list').innerHTML = html + '</div>';
    document.getElementById('match-player-detail').innerHTML = '';
}

function showPlayersByMatch(teamNameEncoded, matchIndex) {
    const team = processedTeams[decodeURIComponent(teamNameEncoded)];
    const match = team.matches[matchIndex];
    const playersStats = Object.values(team.players).map(player => {
        const stat = player.matchHistory.find(h => h.jornada === match.jornada && h.opponentName === match.opponentName);
        return stat ? { dorsal: player.dorsal, name: player.name, ...stat } : null;
    }).filter(p => p !== null);

    let html = `<h4>Detalle J${match.jornada} vs ${match.opponentName} (${match.score}-${match.opponentScore})</h4>
        <table class="player-stats-table"><thead><tr><th>#</th><th>Nombre</th><th>Pts</th><th>Min</th><th>F</th><th>T1</th><th>T2</th><th>T3</th></tr></thead><tbody>`;
    
    playersStats.sort((a,b) => b.Puntos - a.Puntos).forEach(p => {
        html += `<tr><td>${p.dorsal || '-'}</td><td>${p.name}</td><td><b>${p.Puntos}</b></td><td>${formatTime(p.Minutos)}</td><td>${p.Faltas}</td>
            <td>${renderShotEfficiency(p.shotsOfOneSuccessful, p.shotsOfOneAttempted, 'compact_pct')}</td>
            <td>${renderShotEfficiency(p.shotsOfTwoSuccessful, p.shotsOfTwoAttempted, 'successful_only')}</td>
            <td>${renderShotEfficiency(p.shotsOfThreeSuccessful, p.shotsOfThreeAttempted, 'successful_only')}</td></tr>`;
    });
    const container = document.getElementById('match-player-detail');
    container.innerHTML = html + '</tbody></table>';
    renderShotChart(getSuccessfulShotsForMatch(team, match), 'match-player-detail');
}

function getSuccessfulShotsForMatch(team, match) {
    const allShots = [];
    Object.values(team.players).forEach(player => {
        const originalMatch = Object.values(allMatchSummaries).find(m => m.jornada === match.jornada && m.teams.some(t => t.name === team.name) && m.teams.some(t => t.name === match.opponentName));
        if (originalMatch) {
            const teamData = originalMatch.teams.find(t => t.name === team.name);
            const pData = teamData?.players.find(p => p.name === player.name || p.dorsal === player.dorsal);
            (pData?.data?.shootingOfTwoSuccessfulPoint || []).forEach(s => {
                if (s.xnormalize) allShots.push({ x: s.xnormalize, y: s.ynormilize, name: player.name });
            });
        }
    });
    return allShots;
}

function renderShotChart(shots, containerId) {
    const container = document.getElementById(containerId);
    if (!shots.length) { container.innerHTML += '<p class="warning">Sin coordenadas de tiros.</p>'; return; }
    let html = `<div class="shot-chart-container"><img src="./img/half_court.png" class="court-image">`;
    shots.forEach(s => {
        html += `<div class="shot-marker successful" style="left: ${s.x/10}%; top: ${s.y/10}%;" title="${s.name}"></div>`;
    });
    container.innerHTML += `<h4 style="margin-top:20px;">Mapa de Tiros (Canastas de 2)</h4>${html}</div>`;
}

// Dentro de la función showPlayersByMatch en ui-matches.js
// Actualizar el encabezado y las celdas de la tabla:

function generatePlayerMatchDetailTable(players) {
    let html = `
        <table class="player-stats-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Pts</th>
                    <th>T1 (Libres)</th>
                    <th>T2</th>
                    <th>T3</th>
                    <th>F</th>
                </tr>
            </thead>
            <tbody>`;

    players.sort((a,b) => b.Puntos - a.Puntos).forEach(p => {
        html += `
            <tr>
                <td>${p.dorsal || '-'}</td>
                <td>${p.name}</td>
                <td><b>${p.Puntos}</b></td>
                <td>${renderShotEfficiency(p.shotsOfOneSuccessful, p.shotsOfOneAttempted, 'compact_pct')}</td>
                <td>${p.shotsOfTwoSuccessful}</td>
                <td>${p.shotsOfThreeSuccessful}</td>
                <td>${p.Faltas}</td>
            </tr>`;
    });
    return html + `</tbody></table>`;
}