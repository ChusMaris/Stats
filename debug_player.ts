
import { supabase } from './supabaseClient';

async function debugPlayerSearch(name: string) {
    console.log(`--- DEBUG SEARCH FOR: ${name} ---`);
    
    // 1. Buscar en la tabla de jugadores directamente
    const { data: players, error: pError } = await supabase
        .from('jugadores')
        .select('*')
        .ilike('nombre_completo', `%${name}%`);
    
    if (pError) {
        console.error("Error buscando en jugadores:", pError);
    } else {
        console.log(`Encontrados en 'jugadores': ${players.length}`);
        players.forEach(p => console.log(` - ID: ${p.id} | Nombre: ${p.nombre_completo}`));
    }

    if (players && players.length > 0) {
        const playerIds = players.map(p => p.id);
        
        // 2. Buscar en plantillas
        const { data: roster, error: rError } = await supabase
            .from('plantillas')
            .select('*, equipos(id, nombre_especifico, competicion_id)')
            .in('jugador_id', playerIds);
            
        if (rError) {
            console.error("Error buscando en plantillas:", rError);
        } else {
            console.log(`\nAparece en 'plantillas' (roster): ${roster.length} veces`);
            roster.forEach(r => {
                const team = Array.isArray(r.equipos) ? r.equipos[0] : r.equipos;
                console.log(` - JugadorID: ${r.jugador_id} | Equipo: ${team?.nombre_especifico} (ID Competicion: ${team?.competicion_id}) | Dorsal: ${r.dorsal}`);
            });
        }

        // 3. Buscar en estadísticas
        const { data: stats, error: sError } = await supabase
            .from('estadisticas_jugador_partido')
            .select('id, partido_id, jugador_id, puntos')
            .in('jugador_id', playerIds)
            .limit(5);

        if (sError) {
            console.error("Error buscando en estadísticas:", sError);
        } else {
            console.log(`\nAparecen estadísticas: ${stats.length} filas (mostrando max 5)`);
        }
    }
}

// Ejecutar para Oriol
const target = "Oriol Martinez Just";
debugPlayerSearch(target).then(() => {
    // También buscar solo por apellido por si acaso
    return debugPlayerSearch("Martinez Just");
}).then(() => {
    return debugPlayerSearch("VICTOR DELGADO NIETO");
}).then(() => {
    return debugPlayerSearch("DELGADO NIETO");
});
