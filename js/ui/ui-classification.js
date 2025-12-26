// js/ui/ui-classification.js
function renderClassificationTable() {
    const list = calculateClassification(allMatchSummaries);
    let html = `<table class="stats-table" id="classificationTable">
        <thead><tr>
            <th style="text-align: left;">Equipo</th>
            <th data-key="J" data-type="numeric">J</th><th data-key="G" data-type="numeric">G</th>
            <th data-key="P" data-type="numeric">P</th><th data-key="NP" data-type="numeric">NP</th>
            <th data-key="PF" data-type="numeric">PF</th><th data-key="PC" data-type="numeric">PC</th>
            <th data-key="diff" data-type="numeric">DIF</th><th data-key="Ptos" data-type="numeric" class="sort-desc">Ptos</th>
        </tr></thead><tbody>`;

    list.forEach((t, index) => {
        const diffStyle = t.diff >= 0 ? 'color: var(--success-color);' : 'color: var(--fail-color);';
        const logoUrl = TEAM_LOGOS[t.name.toUpperCase().trim()];
        const logoImg = logoUrl ? `<div style="width: 32px; height: 32px; background-color: white; border: 1px solid #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; overflow: hidden; padding: 2px;"><img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.parentElement.style.display='none'"></div>` : `<span style="width: 44px; display: inline-block;"></span>`;

        html += `<tr>
            <td style="text-align: left; display: flex; align-items: center; padding: 8px 10px;">
                <span style="min-width: 25px; font-weight: bold;">${index + 1}.</span>
                ${logoImg}<span style="font-weight: 500;">${t.name}</span>
            </td>
            <td>${t.J}</td><td>${t.G}</td><td>${t.P}</td><td>${t.NP}</td>
            <td>${t.PF}</td><td>${t.PC}</td><td style="${diffStyle}">${t.diff}</td><td><strong>${t.Ptos}</strong></td>
        </tr>`;
    });
    document.getElementById('classification-content').innerHTML = html + `</tbody></table>`;
    makeTableSortable('classificationTable', list.map(item => ({...item})));
}

function renderPointsEvolutionGraph() {
    if (typeof Chart === 'undefined') return;
    const evolutionData = getPointsEvolutionData(); 
    const ctx = document.getElementById('pfEvolutionChart');
    if (!ctx || evolutionData.length === 0) return;
    if (pfChart) pfChart.destroy();
    
    pfChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: evolutionData.map((team, index) => ({
            label: team.teamName, data: team.data, borderColor: ['#3f51b5', '#ff9800', '#4caf50', '#f44336', '#9c27b0', '#00bcd4'][index % 6], fill: false, tension: 0.1, pointRadius: 5
        }))},
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'linear', position: 'bottom', ticks: { stepSize: 1 } }, y: { beginAtZero: true } } }
    });
}