// js/uploader.js

document.getElementById('btnCargar').addEventListener('click', async () => {
    const log = document.getElementById('log');
    const fMain = document.getElementById('fileMain').files[0];
    const fMoves = document.getElementById('fileMoves').files[0];
    
    const tempNom = document.getElementById('temporada').value;
    const catNom = document.getElementById('categoria').value;
    const compNom = document.getElementById('competicion').value;

    if (!fMain || !fMoves) {
        alert("⚠️ Selecciona ambos archivos JSON.");
        return;
    }

    try {
        log.innerHTML = "⏳ Leyendo archivos...";
        const mainData = JSON.parse(await fMain.text());
        const movesData = JSON.parse(await fMoves.text());
        await importarPartido(mainData, movesData, tempNom, catNom, compNom);
    } catch (err) {
        log.innerHTML += `<br><span class="error">❌ Error: ${err.message}</span>`;
    }
});

/**
 * MÉTODO NUEVO: Gestión de selección múltiple y emparejamiento
 */
async function procesarSeleccionMultiple() {
    const mainFiles = document.getElementById('archivoPrincipal').files;
    const movesFiles = document.getElementById('archivoMovimientos').files;
    const log = document.getElementById('log');
    const pBar = document.getElementById('progressBar');
    const pContainer = document.getElementById('progressContainer');

    const temp = document.getElementById('temporadaInput').value;
    const cat = document.getElementById('categoriaInput').value;
    const comp = document.getElementById('competicionInput').value;

    if (!temp || !cat || !comp || mainFiles.length === 0) {
        alert("Faltan datos o archivos.");
        return;
    }

    pContainer.style.display = 'block';
    log.innerHTML = "<b>[SISTEMA] Iniciando carga masiva...</b><br>";

    const total = mainFiles.length;
    for (let i = 0; i < total; i++) {
        const file = mainFiles[i];
        const prefijo = file.name.substring(0, 5); // Ejemplo: "J1_P1"

        log.innerHTML += `<br>> Procesando (${i + 1}/${total}): ${file.name}...`;

        try {
            // CORRECCIÓN: Definir mainJson correctamente antes de usarlo
            const mainText = await file.text();
            const mainJson = JSON.parse(mainText);

            // Buscar archivo de movimientos por prefijo
            let movesJson = null;
            const movesFile = Array.from(movesFiles).find(f => f.name.startsWith(prefijo));

            if (movesFile) {
                console.log(`✅ Emparejado: ${file.name} <--> ${movesFile.name}`);
                const movesText = await movesFile.text();
                movesJson = JSON.parse(movesText);
                log.innerHTML += ` <span style="color:#3498db">(Movimientos detectados)</span>`;
            } else {
                console.warn(`⚠️ No hay movimientos para ${prefijo}`);
            }

            // Llamar a la importación
            await importarPartido(mainJson, movesJson, temp, cat, comp);

            // Actualizar barra
            const porcentaje = Math.round(((i + 1) / total) * 100);
            pBar.style.width = porcentaje + "%";
            pBar.innerText = porcentaje + "%";
            log.innerHTML += ` <span style="color:#2ecc71">OK ✅</span>`;

        } catch (err) {
            log.innerHTML += ` <span style="color:#e74c3c">ERROR ❌ (${err.message})</span>`;
            console.error("Error en bucle:", err);
        }
    }
    log.innerHTML += `<br><br><b>[SISTEMA] PROCESO FINALIZADO.</b>`;
}

async function importarPartido(mainJson, movesJson, temp, cat, comp) {
    try {
        // 1. ESTRUCTURA BÁSICA: Temporada, Categoría y Competición
        const { data: tData } = await supabaseClient.from('temporadas').upsert({ nombre: temp }, { onConflict: 'nombre' }).select().single();
        const { data: cData } = await supabaseClient.from('categorias').upsert({ nombre: cat }, { onConflict: 'nombre' }).select().single();
        const { data: compData } = await supabaseClient.from('competiciones').upsert({ 
            nombre: comp, categoria_id: cData.id, temporada_id: tData.id
        }, { onConflict: 'nombre, categoria_id, temporada_id' }).select().single();

        // 2. EQUIPOS Y CLUBS
        let idLocal = null, idVisitante = null;
        const mapaEquipos = {}; 
        for (let i = 0; i < mainJson.teams.length; i++) {
            const t = mainJson.teams[i];
            const { data: club } = await supabaseClient.from('clubs').upsert({ nombre: t.name, nombre_corto: t.shortName }, { onConflict: 'nombre' }).select().single();
            const { data: eq } = await supabaseClient.from('equipos').upsert({
                club_id: club.id, categoria_id: cData.id, temporada_id: tData.id, team_id_intern_fce: t.teamIdIntern
            }, { onConflict: 'club_id, categoria_id, temporada_id' }).select().single();
            if (i === 0) idLocal = eq.id; else idVisitante = eq.id;
            mapaEquipos[String(t.teamIdIntern)] = eq.id;
        }

        // 3. PARTIDO: Marcador final desde el primer jugador de referencia
        const playerRef = mainJson.teams[0]?.players[0];
        const { data: partido } = await supabaseClient.from('partidos').upsert({
            id_match_extern: mainJson.idMatchExtern,
            id_match_intern: mainJson.idMatchIntern,
            temporada_id: tData.id,
            competicion_id: compData.id,
            equipo_local_id: idLocal,
            equipo_visitante_id: idVisitante,
            fecha_hora: new Date(mainJson.time).toISOString(),
            puntos_local: playerRef?.teamScore || 0,
            puntos_visitante: playerRef?.oppScore || 0,
            periodos_totales: mainJson.period || 0,
            duracion_periodo: mainJson.periodDuration || 0
        }, { onConflict: 'id_match_extern' }).select().single();

        // 4. JUGADORES, ESTADÍSTICAS Y DETALLE DE TIROS
        const mapaJugadores = {}; 
        for (const t of mainJson.teams) {
            const currentEquipoId = mapaEquipos[String(t.teamIdIntern)];
            for (const p of t.players) {
                // Maestro Jugador
                const { data: jug } = await supabaseClient.from('jugadores').upsert({
                    actor_id: p.actorId, nombre_completo: p.name
                }, { onConflict: 'actor_id' }).select().single();
                mapaJugadores[String(p.actorId)] = jug.id;

                // Plantilla (Actualizar dorsal del jugador en el equipo)
                await supabaseClient.from('plantillas').upsert({
                    equipo_id: currentEquipoId, 
                    jugador_id: jug.id,
                    dorsal: String(p.dorsal || "")
                }, { onConflict: 'equipo_id, jugador_id' });

                const d = p.data || {};

                // --- GUARDAR ESTADÍSTICA Y OBTENER ID ---
                const { data: statRecord, error: statErr } = await supabaseClient.from('estadisticas_jugador_partido').upsert({
                    partido_id: partido.id, 
                    jugador_id: jug.id,
                    puntos: d.score || 0,
                    valoracion: d.valoration || 0,
                    t1_anotados: d.shotsOfOneSuccessful || 0,
                    t2_anotados: d.shotsOfTwoSuccessful || 0,
                    t3_anotados: d.shotsOfThreeSuccessful || 0,
                    t1_intentados: d.shotsOfOneAttempted || 0,
                    t2_intentados: d.shotsOfTwoAttempted || 0,
                    t3_intentados: d.shotsOfThreeAttempted || 0,
                    asistencias: d.assists || 0,
                    rebotes_defensivos: d.defensiveRebound || 0,
                    rebotes_ofensivos: d.offensiveRebound || 0,
                    tapones: d.block || 0,
                    faltas_cometidas: d.faults || 0,
                    faltas_personales: d.personal || 0
                }, { onConflict: 'partido_id, jugador_id' }).select().single();

                if (statErr) {
                    console.error(`Error en estadísticas de ${p.name}:`, statErr.message);
                    continue;
                }

                // --- DETALLE DE TIROS (T2 Y T3) ---
                let tirosData = [];
                const procesarTiros = (arrayTiros, tipo) => {
                    if (arrayTiros && Array.isArray(arrayTiros)) {
                        arrayTiros.forEach(tiro => {
                            tirosData.push({
                                estadistica_id: statRecord.id, // FK de la estadística recién guardada
                                tipo_tiro: tipo,               // 'T2' o 'T3'
                                periodo: tiro.period || 0,
                                minuto: tiro.min || 0,
                                segundo: tiro.sec || 0,
                                x: tiro.x || 0,
                                y: tiro.y || 0,
                                x_norm: tiro.xnormalize || 0,
                                y_norm: tiro.ynormalize || 0
                            });
                        });
                    }
                };

                procesarTiros(d.shootingOfTwoSuccessfulPoint, 'T2');
                procesarTiros(d.shootingOfThreeSuccessfulPoint, 'T3');

                if (tirosData.length > 0) {
                    const { error: errorTiros } = await supabaseClient.from('detalle_tiros_jugador').insert(tirosData);
                    if (errorTiros) console.error(`Error insertando tiros de ${p.name}:`, errorTiros.message);
                }
            }
        }

        // 5. MOVIMIENTOS
        if (movesJson) {
            const rawMoves = Array.isArray(movesJson) ? movesJson : (movesJson.moves || []);
            const dataMovimientos = rawMoves.map(m => ({
                partido_id: partido.id,
                periodo: m.period ?? 0,
                minuto: m.min ?? 0,
                segundo: m.second ?? m.sec ?? 0,
                tipo_movimiento: String(m.idMove || 'EVENTO'),
                descripcion: m.move || '',
                jugador_id: m.actorId ? mapaJugadores[String(m.actorId)] : null,
                equipo_id: m.idTeam ? mapaEquipos[String(m.idTeam)] : null,
                marcador: m.score || '',
                event_uuid: m.event_uuid || m.eventUuid
            }));
            await supabaseClient.from('partido_movimientos').upsert(dataMovimientos, { onConflict: 'event_uuid' });
        }

        // 6. EVOLUCIÓN DEL MARCADOR
        if (mainJson.score && Array.isArray(mainJson.score)) {
            const dataEvolucion = mainJson.score.map(s => ({
                partido_id: partido.id,
                periodo: s.period ?? 0,
                minuto_cuarto: s.minuteQuarter ?? 0,
                minuto_absoluto: s.minuteAbsolute ?? 0,
                puntos_local: s.local ?? 0,
                puntos_visitante: s.visit ?? 0,
                diferencia: Math.abs((s.local ?? 0) - (s.visit ?? 0))
            }));
            await supabaseClient.from('partido_marcador_evolucion').insert(dataEvolucion);
        }

        return true;
    } catch (err) {
        console.error("Error crítico en la importación:", err);
        throw err;
    }
}