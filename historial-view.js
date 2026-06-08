(async function() {
    'use strict';

    // CDN Concatenado Dinámico Institucional Anti-CORS de Firebase v10.12.0
    const cdn = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';
    
    const { db } = await import('./firebase-config.js');
    const { doc, getDoc, collection, getDocs, query, where, orderBy } = await import(cdn + 'firebase-firestore.js');

    // Captura de elementos del DOM de historial.html
    const statusCarga = document.getElementById('statusCargaHistorial');
    const tarjetaAlumno = document.getElementById('tarjetaAlumnoFicha');
    const contenedorTimeline = document.getElementById('contenedorTimelineAuditoria');
    const listaEventos = document.getElementById('listaEventosTimeline');

    // Leer los parámetros de la URL (ej: historial.html?dni=51421101)
    const parametrosUrl = new URLSearchParams(window.location.search);
    const dniEstudiante = parametrosUrl.get('dni');

    if (!dniEstudiante) {
        statusCarga.innerHTML = `<p class="text-sm text-rose-400 font-medium">⚠️ Error de acceso: No se especificó ningún DNI de estudiante para auditar.</p>`;
        return;
    }

    try {
        // 1. Consultar y poblar los datos generales del estudiante
        const alumnoSnap = await getDoc(doc(db, "alumnos", dniEstudiante));
        
        if (!alumnoSnap.exists()) {
            statusCarga.innerHTML = `<p class="text-sm text-rose-400 font-medium">⚠️ El legajo digital con DNI ${dniEstudiante} no existe en los registros de la institución.</p>`;
            return;
        }

        const alumno = alumnoSnap.data();
        
        // Mapeo flexible de curso
        let cursoEstudianteText = "Mesa de Entrada / Pendiente";
        if (alumno.cursoId) {
            const cursoSnap = await getDoc(doc(db, "cursos", alumno.cursoId));
            if (cursoSnap.exists()) {
                const cData = cursoSnap.data();
                cursoEstudianteText = `${cData.ciclo || "1°"} "${cData.division || "A"}" (${cData.turno || "Mañana"})`;
            }
        }

        // Rellenar la tarjeta superior
        document.getElementById('nombreAlumnoHistorial').textContent = alumno.nombre || "Sin registrar";
        document.getElementById('dniAlumnoHistorial').textContent = `DNI: ${dniEstudiante}`;
        document.getElementById('cursoAlumnoHistorial').textContent = `Curso: ${cursoEstudianteText}`;
        document.getElementById('cicloAlumnoHistorial').textContent = `Ciclo Lectivo: ${alumno.cicloLectivo || "2026"}`;

        // 2. Consultar y construir la línea de tiempo forense
        const eventosRef = collection(db, "historial_eventos");
        const consultaEstructurada = query(
            eventosRef, 
            where("dni_alumno", "==", dniEstudiante),
            orderBy("fecha_hora", "desc")
        );

        const querySnapshot = await getDocs(consultaEstructurada);
        
        // Ocultar y mostrar paneles usando estilos nativos directos seguros
        statusCarga.style.display = 'none';
        tarjetaAlumno.style.display = 'block';
        contenedorTimeline.style.display = 'block';

        listaEventos.innerHTML = "";

        if (querySnapshot.empty) {
    // Ocultar y mostrar paneles usando estilos nativos directos seguros
        statusCarga.style.display = 'none';
        tarjetaAlumno.style.display = 'block';
        contenedorTimeline.style.display = 'block';
        document.getElementById('panelFiltrosTrayectoria').style.display = 'block';

    
    // Inyectamos el mensaje directamente en el contenedor preexistente de tu HTML
    const listaEventos = document.getElementById("listaEventosTimeline");
    if (listaEventos) {
        listaEventos.innerHTML = `<p style="color: #94a3b8; font-size: 0.875rem; padding: 10px 0;">No se registran firmas o movimientos forenses para este legajo digital bajo el nuevo módulo de trazabilidad.</p>`;
    }
    return;

        }
        // Renderizado dinámico de la Línea de Tiempo (Timeline)
        // ====== PARCHE V8: FORMATO ULTRA-COMPACTO DE RENGLÓN ÚNICO Colegio HASPEN ======
        function dibujarEventosEnPantalla(listaFiltrada) {
            listaEventos.innerHTML = ""; // Limpiamos el contenedor
            
            if (listaFiltrada.length === 0) {
                listaEventos.innerHTML = `<p class="text-sm text-slate-400 text-center py-8">No se encontraron movimientos registrados para los filtros seleccionados.</p>`;
                return;
            }

            // Contenedor principal de la lista tipo consola/log
            let contenedorHTML = `<div style="display: flex; flex-direction: column; gap: 5px; padding: 6px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box;">`;

            listaFiltrada.forEach(ev => {
                const dExtra = ev.datos_duros || {}; // Acceso seguro a los datos complementarios de la nota
                
                // Formateador exacto de fecha a formato escolar legible (DD/MM/AAAA HH:MM)
                let fechaFormateada = "---";
                if (ev.fecha_hora) {
                    const d = new Date(ev.fecha_hora);
                    if (!isNaN(d.getTime())) {
                        fechaFormateada = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    }
                }

                // Extracción correlativa de variables según el diseño acordado
                const cursoStr = dExtra.curso || dExtra.cursoId || "1° Año";
                const materiaStr = dExtra.materia || ev.descripcion || "Asignatura";
                const operadorStr = ev.operador_nombre || "Sistema";
                
                // Control lógico automatizado: Ingreso vs Modificación
                let accionBadge = "";
                let valorNotaStr = "";
                
                if (ev.subcategoria === "Modificación de Nota" || ev.subcategoria === "MODIFICACION_LEGAJO" || dExtra.notaAnterior !== undefined) {
                    accionBadge = `<span style="color: #ea580c; font-weight: bold; font-size: 11px;">[MODIFICACIÓN]</span>`;
                    valorNotaStr = `<span style="color: #64748b;">${dExtra.campoNota || "Nota"}:</span> <span style="text-decoration: line-through; color: #94a3b8;">${dExtra.notaAnterior || "-"}</span> ➔ <span style="font-weight: bold; color: #0f172a; font-size: 12px;">${dExtra.notaNueva || "-"}</span>`;
                } else {
                    accionBadge = `<span style="color: #2563eb; font-weight: bold; font-size: 11px;">[INGRESO]</span>`;
                    valorNotaStr = `<span style="color: #64748b;">${dExtra.campoNota || "Nota"}:</span> <span style="font-weight: bold; color: #0f172a; font-size: 12px;">${dExtra.notaNueva || dExtra.nota || "-"}</span>`;
                }

                // Construcción de la línea horizontal única monoespaciada
                contenedorHTML += `
                <div class="hover:bg-slate-50" style="display: flex; align-items: center; gap: 8px; padding: 5px 10px; border-bottom: 1px dashed #e2e8f0; font-family: monospace; font-size: 11px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; box-sizing: border-box;">
                    <span style="color: #94a3b8; flex-shrink: 0;">🕒 ${fechaFormateada}</span>
                    <span style="color: #cbd5e1; flex-shrink: 0;">|</span>
                    <span style="color: #475569; font-weight: 600; flex-shrink: 0;">${cursoStr}</span>
                    <span style="color: #cbd5e1; flex-shrink: 0;">|</span>
                    <span style="color: #1e293b; font-weight: 600; text-transform: uppercase; flex-shrink: 0;">${materiaStr}</span>
                    <span style="color: #cbd5e1; flex-shrink: 0;">|</span>
                    <span style="color: #64748b; flex-shrink: 0;">Prof: ${operadorStr}</span>
                    <span style="color: #cbd5e1; flex-shrink: 0;">➔</span>
                    <div style="display: flex; align-items: center; gap: 6px; margin-left: 4px;">
                        ${accionBadge}
                        ${valorNotaStr}
                    </div>
                </div>`;
            });

            contenedorHTML += `</div>`;
            listaEventos.innerHTML = contenedorHTML;
        }
        // ==============================================================================


        // Dibujamos todos los eventos la primera vez
        dibujarEventosEnPantalla(todosLosEventosBici);

        // Exponemos la función para los botones de historial.html
        window.filtrarHistorial = function(anio, categoria) {
            let resultado = todosLosEventosBici;

            // Filtro 1: Año de Cursada (ej: filtra por el número de año escrito en la descripción o ciclo)
            if (anio !== "Todos") {
                const numeroAnio = anio.charAt(0); // Extrae el "1", "2", etc.
                resultado = resultado.filter(ev => 
                    (ev.ciclo_lectivo && ev.ciclo_lectivo.toString().includes(anio)) || 
                    (ev.descripcion && (ev.descripcion.includes(anio) || ev.descripcion.includes(`${numeroAnio}°`)))
                );
            }

            // Filtro 2: Tipo de Registro
            if (categoria !== "TODOS") {
                resultado = resultado.filter(ev => ev.categoria === categoria);
            }

            // Actualizamos la pantalla con los datos filtrados
            dibujarEventosEnPantalla(resultado);
        };


    } catch (error) {
    console.error("Fallo forense en la renderización del historial:", error);
    
    // Verificación específica de falta de índice compuesto requerido por Firebase
    if (error.message && error.message.includes("index")) {
        statusCarga.innerHTML = `
            <div style="padding: 20px; border: 1px solid #f43f5e; background-color: #881337; border-radius: 8px; text-align: left;">
                <p class="text-sm text-rose-400 font-bold">⚠ Falta el Índice Compuesto en Firestore</p>
                <p class="text-xs text-slate-200" style="margin-top: 8px;">Para que esta consulta funcione, Google requiere un índice ordenado. Por favor:</p>
                <ol class="text-xs text-slate-300" style="margin-top: 6px; padding-left: 20px; line-height: 1.5;">
                    <li>Presioná la tecla <b>F12</b> en tu teclado para abrir las Herramientas de Desarrollador.</li>
                    <li>Hacé clic en la pestaña <b>Consola (Console)</b>.</li>
                    <li>Buscá el enlace azul de Firebase que empieza con <i>https://google.com...</i> y hacé clic.</li>
                    <li>Presioná el botón <b>"Crear índice"</b> en la web de Google y esperá 3 minutos.</li>
                </ol>
            </div>
        `;
    } else {
        statusCarga.innerHTML = `<p class="text-sm text-rose-400 font-medium">⚠ Error crítico de conexión al procesar la línea de tiempo escolar. Detalles: ${error.message || error}</p>`;
    }
}


})();
