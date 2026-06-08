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

    // ====== PARCHE DEFINITIVO V14: CONSOLIDACIÓN DE QUERY Y RENDERIZADO HORIZONTAL ======
    const querySnapshot = await getDocs(consultaEstructurada);

    // Ocultar y mostrar paneles usando estilos nativos directos seguros
    statusCarga.style.display = 'none';
    tarjetaAlumno.style.display = 'block';
    contenedorTimeline.style.display = 'block';
    document.getElementById('panelFiltrosTrayectoria').style.display = 'block';

    listaEventos.innerHTML = "";

    // 1. Recolección de eventos utilizando tu variable nativa del repositorio
    const todosLosEventosBici = [];
    querySnapshot.forEach(docSnap => {
        todosLosEventosBici.push({ id: docSnap.id, ...docSnap.data() });
    });

    // 2. Función unificada de renderizado horizontal ultra-compacto
    function dibujarEventosEnPantalla(listaFiltrada) {
        listaEventos.innerHTML = "";
        
        if (listaFiltrada.length === 0) {
            listaEventos.innerHTML = `
            <div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.85rem; font-family: sans-serif;">
                No se registran firmas o movimientos para el filtro seleccionado en este ciclo lectivo.
            </div>`;
            return;
        }

        let contenedorHTML = `<div style="display: flex; flex-direction: column; gap: 5px; padding: 6px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box;">`;

        listaFiltrada.forEach(ev => {
            const dExtra = ev.datos_duros || {};
            
            // Formateador robusto de marcas de tiempo (DD/MM/AAAA HH:MM)
            let fechaFormateada = "---";
            if (ev.fecha_hora) {
                const d = new Date(ev.fecha_hora);
                if (!isNaN(d.getTime())) {
                    fechaFormateada = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                }
            }

            const cursoStr = dExtra.curso || dExtra.cursoId || "1° Año";
            const materiaStr = dExtra.materia || ev.descripcion || "Asignatura";
            const operadorStr = ev.operador_nombre || "Sistema";
            
            let accionBadge = "";
            let valorNotaStr = "";
            
            if (ev.subcategoria === "Modificación de Nota" || ev.subcategoria === "MODIFICACION_LEGAJO" || dExtra.notaAnterior !== undefined) {
                accionBadge = `<span style="color: #ea580c; font-weight: bold; font-size: 11px;">[MODIFICACIÓN]</span>`;
                valorNotaStr = `<span style="color: #64748b;">${dExtra.campoNota || "Nota"}:</span> <span style="text-decoration: line-through; color: #94a3b8;">${dExtra.notaAnterior || "-"}</span> ➔ <span style="font-weight: bold; color: #0f172a; font-size: 12px;">${dExtra.notaNueva || "-"}</span>`;
            } else {
                accionBadge = `<span style="color: #2563eb; font-weight: bold; font-size: 11px;">[INGRESO]</span>`;
                valorNotaStr = `<span style="color: #64748b;">${dExtra.campoNota || "Nota"}:</span> <span style="font-weight: bold; color: #0f172a; font-size: 12px;">${dExtra.notaNueva || dExtra.nota || "-"}</span>`;
            }

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

    // 3. Renderizado automático inicial en pantalla
    dibujarEventosEnPantalla(todosLosEventosBici);

    // 4. Asignación de EventListeners reactivos en la botonera lateral
    const botonesFiltro = document.querySelectorAll('.btn-cat');
    botonesFiltro.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const botonActivo = e.target.closest('.btn-cat');
            if (!botonActivo) return;

            // Conmutación estética del Azul Institucional
            botonesFiltro.forEach(b => {
                b.style.background = "#f8fafc";
                b.style.color = "#475569";
                b.classList.remove('active');
            });
            botonActivo.style.background = "#1b4d82";
            botonActivo.style.color = "#ffffff";
            botonActivo.classList.add('active');

            const categoriaSeleccionada = botonActivo.getAttribute('data-cat') || "TODOS";

            // Filtro adaptativo cruzado con soporte para el historial viejo (CALIFICACIONES)
            if (categoriaSeleccionada === "TODOS") {
                dibujarEventosEnPantalla(todosLosEventosBici);
            } else if (categoriaSeleccionada === "NOTAS_INFORMES") {
                const filtrados = todosLosEventosBici.filter(ev => 
                    ev.categoria === "CALIFICACIONES" || ev.categoria === "NOTAS_INFORMES"
                );
                dibujarEventosEnPantalla(filtrados);
            } else {
                const filtrados = todosLosEventosBici.filter(ev => ev.categoria === categoriaSeleccionada);
                dibujarEventosEnPantalla(filtrados);
            }
        });
    });

    // 5. Soporte puente de interconexión para selectores externos de año
    window.filtrarHistorial = function(anio, categoria) {
        let resultado = todosLosEventosBici;
        if (anio !== "Todos") {
            resultado = resultado.filter(ev => ev.ciclo_lectivo && ev.ciclo_lectivo.toString().includes(anio));
        }
        if (categoria && categoria !== "TODOS") {
            if (categoria === "NOTAS_INFORMES") {
                resultado = resultado.filter(ev => ev.categoria === "CALIFICACIONES" || ev.categoria === "NOTAS_INFORMES");
            } else {
                resultado = resultado.filter(ev => ev.categoria === categoria);
            }
        }
        dibujarEventosEnPantalla(resultado);
    };

} catch (error) {
    console.error("Fallo forense en la renderización del historial:", error);
    statusCarga.innerHTML = `<p class="text-sm text-rose-400 font-medium">⚠️ Error crítico de conexión al procesar la línea de tiempo escolar.</p>`;
}
})();
