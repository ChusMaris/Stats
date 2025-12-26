// js/ui/ui-events.js

document.addEventListener('DOMContentLoaded', () => {
    // Listener Pestañas de Detalle
    document.querySelectorAll('#detail-tabs .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            document.querySelectorAll('#detail-tabs .tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            refreshDetailTabsVisibility(targetTab);
            renderCurrentDetailTab(targetTab);
        });
    });
});

function renderCurrentDetailTab(tabName) {
    const team = processedTeams[currentSelectedTeam];
    if (!team) return;
    if (tabName === 'player-cards') renderPlayerCards(Object.values(team.players), 'player-cards-container');
    else if (tabName === 'aggregated') displayPlayerAggregateStats();
    else if (tabName === 'matches') displayMatchList();
}

function populateTeamFilter(teamNames) {
    const select = document.getElementById('teamFilterDetail');
    const sortedNames = Array.from(teamNames).sort();
    select.innerHTML = sortedNames.map(name => `<option value="${name}">${name}</option>`).join('');
    
    if (sortedNames.length > 0) {
        currentSelectedTeam = sortedNames[0];
        select.onchange = (e) => {
            currentSelectedTeam = e.target.value;
            renderCurrentDetailTab(document.querySelector('#detail-tabs .tab-button.active').getAttribute('data-tab'));
        };
        renderCurrentDetailTab('player-cards'); // Carga tarjetas por defecto
    }
}