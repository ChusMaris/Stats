// js/ui/ui-base.js
let pfChart = null; 

function toggleDashboardView(show) {
    const content = document.getElementById('dashboard-content');
    if (content) content.style.display = show ? 'block' : 'none'; 
}

function displayKPIs() {
    const totalMatches = Object.keys(allMatchSummaries).length;
    const totalTeams = Object.keys(processedTeams).length;
    let totalGF = 0, totalGC = 0;
    Object.values(processedTeams).forEach(t => {
        totalGF += t.stats.GF;
        totalGC += t.stats.GC;
    });
    const avgGFPerMatch = totalMatches > 0 ? (totalGF + totalGC) / (totalMatches * 2) : 0; 
    
    const kpiHtml = [
        { label: "Partidos Procesados", value: totalMatches },
        { label: "Equipos", value: totalTeams },
        { label: "Puntos Totales", value: totalGF + totalGC },
        { label: "Media Ptos/Part.", value: avgGFPerMatch.toFixed(1) }
    ].map(k => `<div class="kpi-card"><div class="value">${k.value}</div><div class="label">${k.label}</div></div>`).join('');
    document.getElementById('kpi-container').innerHTML = kpiHtml;
}

function refreshDetailTabsVisibility(targetTab) {
    const containers = {
        'player-cards': 'tab-content-player-cards',
        'aggregated': 'tab-content-aggregated',
        'matches': 'tab-content-matches'
    };
    Object.keys(containers).forEach(key => {
        const el = document.getElementById(containers[key]);
        if (el) el.style.display = (key === targetTab) ? 'block' : 'none';
    });
}