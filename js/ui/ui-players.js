// js/ui/ui-players.js

function displayPlayerAggregateStats() {
    const team = processedTeams[currentSelectedTeam];
    if (!team) return;
    const playersArray = Object.values(team.players).map(p => ({
        dorsal: p.dorsal, Jugador: p.name, PJ: p.stats.PJ, Minutos: p.stats.Minutos, Puntos: p.stats.Puntos,
        'T1': renderShotEfficiency(p.stats.shotsOfOneSuccessful, p.stats.shotsOfOneAttempted),
        'T2': p.stats.shotsOfTwoSuccessful, 'T3': p.stats.shotsOfThreeSuccessful, Faltas: p.stats.Faltas
    }));

    let html = `<table class="stats-table" id="playerStatsTable"><thead><tr>
        <th data-key="dorsal" data-type="numeric">#</th>
        <th data-key="Jugador" data-type="text">Jugador</th>
        <th data-key="PJ" data-type="numeric">PJ</th>
        <th data-key="Minutos" data-type="numeric">Min</th>
        <th data-key="Puntos" data-type="numeric">Pts</th>
        <th data-key="T1" data-type="ratio">T1 (Libres)</th>
        <th data-key="T2" data-type="numeric">T2</th>
        <th data-key="T3" data-type="numeric">T3</th>
        <th data-key="Faltas" data-type="numeric">F</th>
        </tr></thead><tbody>`;
    playersArray.sort((a,b) => b.Puntos - a.Puntos).forEach(d => {
        html += `<tr class="player-row" data-player-name="${d.Jugador}" onclick="togglePlayerMatchDetail(event, '${d.Jugador}', this)">
            <td>${d.dorsal || '-'}</td><td style="text-align:left;">${d.Jugador}</td><td>${d.PJ}</td><td>${d.Minutos}</td><td>${d.Puntos}</td>
            <td>${d.T1}</td><td>${d.T2}</td><td>${d.T3}</td><td>${d.Faltas}</td>
        </tr><tr id="detail-row-${d.Jugador}" class="match-detail-row" style="display:none;"><td colspan="9" style="padding:0;"></td></tr>`;
    });
    document.getElementById('player-content').innerHTML = html + `</tbody></table>`;
    makeTableSortable('playerStatsTable', playersArray);
}

function renderPlayerCards(players, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cardsHtml = players.sort((a, b) => b.stats.Puntos - a.stats.Puntos).map(p => {
        const key = p.name.toUpperCase().trim();
        const fotoUrl = (typeof JUGADOR_FOTOS !== 'undefined' && JUGADOR_FOTOS[key]) || "img/img_avatar.png";

        return `
            <div class="player-card" onclick="goToPlayerDetail('${p.name}')">
                <div class="card-photo-container"><img src="${fotoUrl}" onerror="this.src='img/img_avatar.png'"></div>
                <div class="card-dorsal">#${p.dorsal || '??'}</div>
                <div class="card-name">${p.name}</div>
                <div class="card-stats-grid">
                    <div class="stat-item"><span class="stat-value">${p.stats.PJ}</span><span class="stat-label">PJ</span></div>
                    <div class="stat-item"><span class="stat-value">${formatTime(p.stats.Minutos)}</span><span class="stat-label">MIN</span></div>
                    <div class="stat-item"><span class="stat-value">${p.stats.Puntos}</span><span class="stat-label">PTS</span></div>
                    <div class="stat-item"><span class="stat-value">${p.stats.PJ > 0 ? (p.stats.Puntos / p.stats.PJ).toFixed(1) : 0}</span><span class="stat-label">PPG</span></div>
                    <div class="stat-item"><span class="stat-value">${renderShotEfficiency(p.stats.shotsOfOneSuccessful, p.stats.shotsOfOneAttempted, 'compact_pct')}</span><span class="stat-label">T1</span></div>
                    <div class="stat-item"><span class="stat-value">${p.stats.shotsOfTwoSuccessful}</span><span class="stat-label">T2</span></div>
                    <div class="stat-item"><span class="stat-value">${p.stats.shotsOfThreeSuccessful}</span><span class="stat-label">T3</span></div>
                </div>
            </div>`;
    }).join('');
    container.innerHTML = `<div class="player-cards-grid">${cardsHtml}</div>`;
}

function goToPlayerDetail(playerName) {
    console.log("Clicked player:", playerName, "Current Selected Team:", window.currentSelectedTeam);
    if (window.currentSelectedTeam) { // currentSelectedTeam should be available from config.js
        window.location.href = `player-detail.html?player=${encodeURIComponent(playerName)}&category=${encodeURIComponent(window.currentSelectedTeam)}`;
    } else {
        console.error("No se ha seleccionado ningún equipo. No se puede navegar al detalle del jugador.");
        alert("Por favor, selecciona una categoría para ver el detalle del jugador."); // Añadir un alert para feedback al usuario
    }
}

// Función togglePlayerMatchDetail (Se mantiene igual que la original)
function togglePlayerMatchDetail(event, playerName, clickedRow) {
    event.stopPropagation();
    const detailRow = document.getElementById(`detail-row-${playerName}`);
    if (detailRow && clickedRow.classList.contains('expanded')) {
        detailRow.style.display = 'none';
        clickedRow.classList.remove('expanded');
        return;
    }
    document.querySelectorAll('.match-detail-row').forEach(row => row.style.display = 'none');
    document.querySelectorAll('.player-row').forEach(row => row.classList.remove('expanded'));

    const team = processedTeams[currentSelectedTeam];
    const player = Object.values(team.players).find(p => p.name === playerName);
    if (!player) return;

    let subHtml = `<div class="subgrid-container card" style="margin: 10px;">
        <h4>Desglose por Partido</h4>
        <table class="subgrid-table stats-table">
            <thead>
                <tr>
                    <th>J</th><th>Oponente</th><th>Pts</th><th>Min</th><th>T1</th><th>T2</th><th>T3</th><th>F</th>
                </tr>
            </thead>
            <tbody>`;

    player.matchHistory.forEach(m => {
        subHtml += `<tr>
            <td>${m.jornada}</td>
            <td>vs ${m.opponentName}</td>
            <td>${m.Puntos}</td>
            <td>$(m.Minutos}</td>
            <td>${renderShotEfficiency(m.shotsOfOneSuccessful, m.shotsOfOneAttempted)}</td>
            <td>${renderShotEfficiency(m.shotsOfTwoSuccessful, m.shotsOfTwoAttempted, 'successful_only')}</td>
            <td>${renderShotEfficiency(m.shotsOfThreeSuccessful, m.shotsOfThreeAttempted, 'successful_only')}</td>
            <td>${m.Faltas}</td>
        </tr>`;
    });
    detailRow.querySelector('td').innerHTML = subHtml + `</tbody></table></div>`;
    detailRow.style.display = 'table-row';
    clickedRow.classList.add('expanded');
}