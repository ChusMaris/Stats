// js/ui/ui-tables.js
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
            
            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            header.classList.add(order === 'asc' ? 'sort-asc' : 'sort-desc');

            dataArray.sort(compareValues(key, order, type)); 
            
            if (isClassification) {
                renderClassificationTable(); 
            } else { 
                document.querySelectorAll('.match-detail-row').forEach(row => row.style.display = 'none');
                document.querySelectorAll('.player-row').forEach(row => row.classList.remove('expanded'));
                const fragment = document.createDocumentFragment();
                dataArray.forEach(d => {
                    const playerRow = tbody.querySelector(`.player-row[data-player-name="${d.Jugador}"]`);
                    const detailRow = tbody.querySelector(`#detail-row-${d.Jugador}`);
                    if (playerRow) fragment.appendChild(playerRow);
                    if (detailRow) fragment.appendChild(detailRow);
                });
                tbody.innerHTML = '';
                tbody.appendChild(fragment);
            }
        });
    });
}