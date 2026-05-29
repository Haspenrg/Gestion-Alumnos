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
    // Apagamos el panel de carga y encendemos los paneles del alumno
    statusCarga.style.display = "none";
    tarjetaAlumno.style.display = "block";
    contenedorTimeline.style.display = "block";
    
    // Inyectamos el mensaje directamente en el contenedor preexistente de tu HTML
    const listaEventos = document.getElementById("listaEventosTimeline");
    if (listaEventos) {
        listaEventos.innerHTML = `<p style="color: #94a3b8; font-size: 0.875rem; padding: 10px 0;">No se registran firmas o movimientos forenses para este legajo digital bajo el nuevo módulo de trazabilidad.</p>`;
    }
    return;

        }
        // Renderizado dinámico de la Línea de Tiempo (Timeline)
        querySnapshot.forEach(docSnap => {
            const ev = docSnap.data();
            
            // Configuración cromática de badges según la severidad de la categoría
            let badgeEstilo = "bg-blue-950 text-blue-400 border-blue-900";
            if (ev.subcategoria === "BAJA_PURGADO") badgeEstilo = "bg-rose-950 text-rose-400 border-rose-900";
            if (ev.subcategoria === "MODIFICACION_LEGAJO") badgeEstilo = "bg-amber-950 text-amber-400 border-amber-900";
            if (ev.subcategoria === "ALTA_LOTE") badgeEstilo = "bg-emerald-950 text-emerald-400 border-emerald-900";

            // Formatear la fecha ISO a algo legible
            const fObj = new Date(ev.fecha_hora);
            const fechaFormateada = !isNaN(fObj.getTime()) 
                ? `${fObj.getDate().toString().padStart(2,'0')}/${(fObj.getMonth()+1).toString().padStart(2,'0')}/${fObj.getFullYear()} - ${fObj.getHours().toString().padStart(2,'0')}:${fObj.getMinutes().toString().padStart(2,'0')} hs`
                : "Fecha no especificada";

            const itemHtml = `
                <div class="relative pl-2">
                    <div class="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-slate-600 ring-4 ring-slate-800"></div>
                    <div class="bg-slate-800/60 border border-slate-700/60 p-4 rounded-lg shadow-sm hover:border-slate-600 transition-colors">
                        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                            <span class="px-2 py-0.5 border ${badgeEstilo} text-[10px] font-bold tracking-wide rounded-md uppercase w-fit">
                                ${ev.subcategoria ? ev.subcategoria.replace('_', ' ') : ev.categoria}
                            </span>
                            <span class="text-slate-500 text-[10px] font-medium">${fechaFormateada}</span>
                        </div>
                        <p class="text-slate-200 text-xs leading-relaxed">${ev.descripcion || "Sin detalles de acción."}</p>
                        <div class="mt-3 pt-2 border-t border-slate-700/40 flex flex-wrap justify-between items-center text-[10px] text-slate-400 gap-2">
                            <span><strong>Módulo Base:</strong> ${ev.categoria}</span>
                            <span><strong>Firmado por:</strong> <span class="text-slate-300 font-semibold">${ev.operador_nombre || "Operador Desconocido"}</span></span>
                        </div>
                    </div>
                </div>
            `;
            listaEventos.insertAdjacentHTML('beforeend', itemHtml);
        });

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
