// 1. Utilidades de Log
function logMsg(msg) {
    const log = document.getElementById('log');
    if (log) {
        const span = document.createElement('span');
        span.innerHTML = `<br>> ${msg}`;
        log.appendChild(span);
        log.scrollTop = log.scrollHeight;
    }
    console.log(msg);
}

// 2. Selección y Procesamiento Masivo
async function procesarSeleccionMultiple() {
    const mainFiles = document.getElementById('archivoPrincipal').files;
    const movesFiles = document.getElementById('archivoMovimientos').files;
    const log = document.getElementById('log');
    const pBar = document.getElementById('progressBar');
    const pContainer = document.getElementById('progressContainer');

    const temp = document.getElementById('temporadaInput').value;
    const cat = document.getElementById('categoriaInput').value;
    // Según tus instrucciones, valor por defecto para el combo
    const comp = document.getElementById('competicionInput').value || "2025/26 C.t. Pre-infantil Masculí - SF - Nivell B1 - 04";

    if (!temp || !cat || mainFiles.length === 0) {
        alert("⚠️ Rellena los datos maestros (Temporada y Categoría).");
        return;
    }

    log.innerHTML = "<b>[SISTEMA] Iniciando carga masiva...</b>";
    pContainer.style.display = 'block';

    for (let i = 0; i < mainFiles.length; i++) {
        const file = mainFiles[i];
        const percent = Math.round(((i + 1) / mainFiles.length) * 100);
        pBar.style.width = percent + '%';
        pBar.innerText = percent + '%';

        try {
            logMsg(`Analizando: ${file.name}`);
            
            // Extraer Jornada del nombre del fichero (ej: J1_P1...)
            const matchJornada = file.name.match(/J(\d+)/i);
            const numeroJornada = matchJornada ? parseInt(matchJornada[1]) : null;

            const mainJson = JSON.parse(await file.text());
            
            // Buscar movimientos por ID de partido
            const parts = file.name.split('_');
            const matchId = parts[1]; 
            const movesFile = Array.from(movesFiles).find(f => f.name.includes(matchId));
            const movesJson = movesFile ? JSON.parse(await movesFile.text()) : null;

            await importarPartido(mainJson, movesJson, temp, cat, comp, numeroJornada);
            logMsg(`✅ ${file.name} (Jornada ${numeroJornada}) procesado.`);
        } catch (error) {
            logMsg(`❌ Error crítico en ${file.name}: ${error.message}`);
            console.error(error);
        }
    }
    log.innerHTML += "<br><br><b>[FIN DEL PROCESO]</b>";
}

// 3. Función de Importación Core
async function importarPartido(mainJson, movesJson, tempNom, catNom, compNom, jornadaNum) {
    try {
        if (!mainJson.teams) throw new Error("JSON sin equipos");

        // --- MAESTROS ---
        // Temporada
        const { data: tData, error: tErr } = await supabaseClient.from('temporadas')
            .upsert({ nombre: tempNom }, { onConflict: 'nombre' }).select();
        if (tErr || !tData?.length) throw new Error(`Temporada: ${tErr?.message}`);
        const temporadaId = tData[0].id;

        // Categoría
        const { data: cData, error: cErr } = await supabaseClient.from('categorias')
            .upsert({ nombre: catNom }, { onConflict: 'nombre' }).select();
        if (cErr || !cData?.length) throw new Error(`Categoría: ${cErr?.message}`);
        const categoriaId = cData[0].id;

        // Competición (CLAVE CORREGIDA: nombre, temporada y categoria)
        const { data: compData, error: compErr } = await supabaseClient.from('competiciones').upsert({ 
            nombre: compNom, 
            temporada_id: temporadaId, 
            categoria_id: categoriaId 
        }, { onConflict: 'nombre,temporada_id,categoria_id' }).select();
        
        if (compErr || !compData?.length) throw new Error(`Competición: ${compErr?.message}`);
        const competicionId = compData[0].id;

        // --- EQUIPOS ---
        let idsEquipos = [];
        const mapaEquipos = {}; 
        for (const t of mainJson.teams) {
            const { data: clu, error: cluErr } = await supabaseClient.from('clubs')
                .upsert({ nombre: t.name, nombre_corto: t.shortName }, { onConflict: 'nombre' }).select();
            
            if (cluErr || !clu?.length) throw new Error(`Club ${t.name}: ${cluErr?.message}`);
            const clubId = clu[0].id;

            const { data: eq, error: eqErr } = await supabaseClient.from('equipos').upsert({
                club_id: clubId, 
                competicion_id: competicionId, 
                nombre_especifico: t.name, 
                team_id_intern_fce: String(t.teamIdIntern)
            }, { onConflict: 'club_id,competicion_id' }).select();

            if (eqErr || !eq?.length) throw new Error(`Equipo ${t.name}: ${eqErr?.message}`);
            
            idsEquipos.push(eq[0].id);
            mapaEquipos[String(t.teamIdIntern)] = eq[0].id;
        }

        // --- PARTIDO ---
        // Forzamos ISOString para evitar problemas de alineamiento y formato en Postgres
        const fechaValida = new Date(mainJson.time);
        const fechaISO = isNaN(fechaValida.getTime()) ? new Date().toISOString() : fechaValida.toISOString();

        const { data: partData, error: partErr } = await supabaseClient.from('partidos').upsert({
            id_match_extern: mainJson.idMatchExtern,
            id_match_intern: mainJson.idMatchIntern,
            competicion_id: competicionId,
            equipo_local_id: idsEquipos[0],
            equipo_visitante_id: idsEquipos[1],
            fecha_hora: fechaISO,
            puntos_local: mainJson.teams[0]?.players[0]?.teamScore || 0,
            puntos_visitante: mainJson.teams[0]?.players[0]?.oppScore || 0,
            jornada: jornadaNum
        }, { onConflict: 'id_match_extern' }).select();

        if (partErr || !partData?.length) throw new Error(`Partido: ${partErr?.message}`);
        const partidoId = partData[0].id;

        // --- JUGADORES Y ESTADÍSTICAS ---
        const mapaJugadoresActor = {}; 
        for (const t of mainJson.teams) {
            const eqId = mapaEquipos[String(t.teamIdIntern)];
            for (const p of t.players) {
                const { data: jug, error: jugErr } = await supabaseClient.from('jugadores').upsert({
                    nombre_completo: p.name, actor_id: String(p.actorId)
                }, { onConflict: 'nombre_completo' }).select();
                
                if (jugErr || !jug?.length) throw new Error(`Jugador ${p.name}: ${jugErr?.message}`);
                const jugadorId = jug[0].id;
                mapaJugadoresActor[String(p.actorId)] = jugadorId;

                await supabaseClient.from('plantillas').upsert({
                    jugador_id: jugadorId, equipo_id: eqId, dorsal: p.dorsal ? String(p.dorsal) : null
                }, { onConflict: 'jugador_id,equipo_id' });

                const d = p.data || {};
                const { data: statsData, error: statsErr } = await supabaseClient.from('estadisticas_jugador_partido').upsert({
                    partido_id: partidoId, 
                    jugador_id: jugadorId, 
                    dorsal: p.dorsal ? String(p.dorsal) : null,
                    puntos: d.score || 0, 
                    valoracion: d.valoration || 0,
                    asistencias: d.assists || 0,
                    tapones: d.block || 0,
                    faltas_cometidas: d.faults || 0,
                    t1_anotados: d.shotsOfOneSuccessful || 0, 
                    t2_anotados: d.shotsOfTwoSuccessful || 0, 
                    t3_anotados: d.shotsOfThreeSuccessful || 0,
                    t1_intentados: d.shotsOfOneAttempted || 0, 
                    t2_intentados: d.shotsOfTwoAttempted || 0, 
                    t3_intentados: d.shotsOfThreeAttempted || 0
                }, { onConflict: 'partido_id,jugador_id' }).select();

                if (statsData?.length && d) { 
                    await guardarDetalleTiros(d, statsData[0].id); 
                }
            }
        }

        // --- MARCADOR Y MOVIMIENTOS ---
        if (mainJson.score?.length) {
            const evolData = mainJson.score.map(s => ({
                partido_id: partidoId, periodo: s.period || 0, minuto_cuarto: s.minuteQuarter || 0,
                minuto_absoluto: s.minuteAbsolute || 0, puntos_local: s.local || 0,
                puntos_visitante: s.visit || 0, diferencia: (s.local || 0) - (s.visit || 0)
            }));
            await supabaseClient.from('partido_marcador_evolucion').insert(evolData);
        }

        const movesArray = Array.isArray(movesJson) ? movesJson : [];
        if (movesArray.length > 0) {
            const dataMoves = movesArray.map(m => ({
                partido_id: partidoId, periodo: m.period || 0, minuto: m.min || 0, segundo: m.sec || 0,
                tipo_movimiento: String(m.idMove || ''), descripcion: m.move || '', 
                jugador_id: mapaJugadoresActor[String(m.actorId)] || null,
                equipo_id: mapaEquipos[String(m.idTeam)] || null, marcador: m.score || '', 
                event_uuid: m.event_uuid || m.eventUuid
            }));
            await supabaseClient.from('partido_movimientos').upsert(dataMoves, { onConflict: 'event_uuid' });
        }
        return true;
    } catch (err) {
        throw err;
    }
}

// 4. Detalle de Tiros (Heatmap)
async function guardarDetalleTiros(dataObj, estadisticaId) {
    const tiros = [];
    const config = [
        { key: 'metadataShotsOfOneSuccessful', tipo: '1pt' }, { key: 'metadataShotsOfOneFailed', tipo: '1pt' },
        { key: 'shootingOfTwoSuccessfulPoint', tipo: '2pt' }, { key: 'shootingOfTwoFailedPoint', tipo: '2pt' },
        { key: 'shootingOfThreeSuccessfulPoint', tipo: '3pt' }, { key: 'shootingOfThreeFailedPoint', tipo: '3pt' }
    ];

    config.forEach(cfg => {
        const lista = dataObj[cfg.key];
        if (Array.isArray(lista)) {
            lista.forEach(t => {
                tiros.push({
                    estadistica_id: estadisticaId,
                    tipo_tiro: cfg.tipo,
                    periodo: t.period || 0,
                    minuto: t.minute !== undefined ? t.minute : (t.min || 0),
                    segundo: t.second || 0,
                    x: t.x || 0,
                    y: t.y || 0,
                    x_norm: t.xnormalize || 0,
                    y_norm: t.ynormalize || 0,
                    event_uuid: t.event_uuid || t.eventUuid || null
                });
            });
        }
    });

    if (tiros.length > 0) {
        await supabaseClient.from('detalle_tiros_jugador').upsert(tiros, { onConflict: 'event_uuid' });
    }
}