(async () => {
    const b = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';
    const { collection, getDocs, writeBatch, doc } = await import(b + 'firebase-firestore.js');
    const db = (await import('./firebase-config.js')).db;
    const selectAnioOrigen = document.getElementById("select-anio-origen");
    const selectCursoOrigen = document.getElementById("select-curso-origen");
    const selectAnioDestino = document.getElementById("select-anio-destino");
    const selectCursoDestino = document.getElementById("select-curso-destino");
    const tbodyOrigen = document.getElementById("tbody-origen");
    const tbodyDestino = document.getElementById("tbody-destino");
    const btnPromocionar = document.getElementById("btn-promocionar");
    const btnGuardarCambios = document.getElementById("btn-guardar-cambios");
    const checkTodosOrigen = document.getElementById("check-todos-origen");
    const popover = document.getElementById("popover-irregularidad");
    const popoverContenido = document.getElementById("popover-contenido");
    const filaVaciaDestino = document.getElementById("fila-vacia-destino");
    const cartelProcesando = document.getElementById("cartel-procesando");
    const btnVolverPanel = document.getElementById("btn-volver-panel");
    if (btnVolverPanel) {
        btnVolverPanel.addEventListener("click", () => {
            window.location.href = "panel.html";
        });
    }

    let alumnosOrigenCargados = [];

    const modalSistema = document.getElementById("modal-sistema");
    const modalBtnAceptar = document.getElementById("modal-btn-aceptar");
    const modalBtnCancelar = document.getElementById("modal-btn-cancelar");

        function mostrarModalSistema(titulo, mensaje, esConfirmacion = false) {
        document.getElementById("modal-titulo").innerText = titulo;
        document.getElementById("modal-mensaje").innerText = mensaje;
        modalBtnCancelar.style.display = esConfirmacion ? "inline-block" : "none";
        modalSistema.style.display = "flex";
        return new Promise((resolve) => {
            modalBtnAceptar.onclick = () => { modalSistema.style.display = "none"; resolve(true); };
            if (esConfirmacion) modalBtnCancelar.onclick = () => { modalSistema.style.display = "none"; resolve(false); };
        });
    }



            function generarAniosDinamicos() {
        const anioActual = new Date().getFullYear();
        const anioInicio = 2021;

        selectAnioOrigen.innerHTML = '<option value="">Seleccionar Año...</option>';
        selectAnioDestino.innerHTML = '<option value="">Seleccionar Año...</option>';

        // 1. El Origen solo muestra desde el año actual hacia atrás (ej: 2026 a 2021)
        for (let anio = anioActual; anio >= anioInicio; anio--) {
            selectAnioOrigen.add(new Option(anio, anio));
        }

        // 2. El Destino sí incluye el año entrante para la nueva matrícula (ej: 2027 a 2021)
        for (let anio = (anioActual + 1); anio >= anioInicio; anio--) {
            selectAnioDestino.add(new Option(anio, anio));
        }
    }

    async function cargarCursosDesdeFirestore() {
        try {
            const querySnapshot = await getDocs(collection(db, "cursos"));
            selectCursoOrigen.innerHTML = '<option value="">Seleccionar Curso...</option>';
            selectCursoDestino.innerHTML = '<option value="">Seleccionar Curso...</option>';

            querySnapshot.forEach((documento) => {
                const curso = documento.data();
                const nombreMostrar = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
                
                selectCursoOrigen.add(new Option(nombreMostrar, documento.id));
                selectCursoDestino.add(new Option(nombreMostrar, documento.id));
            });
        } catch (error) {
            console.error("Error al cargar cursos:", error);
        }
    }

    generarAniosDinamicos();
    await cargarCursosDesdeFirestore();
    
        async function cargarAlumnosOrigen() {
        const anio = selectAnioOrigen.value;
        const cursoId = selectCursoOrigen.value;

        tbodyOrigen.innerHTML = "";
        checkTodosOrigen.checked = false;
        alumnosOrigenCargados = [];

        if (!anio || !cursoId) return;

        try {
            const { query, where, query: queryFs } = await import(b + 'firebase-firestore.js');
            
            const qAlumnos = query(
                collection(db, "alumnos"),
                where("cicloLectivo", "==", anio),
                where("cursoId", "==", cursoId)
            );
            const querySnapshot = await getDocs(qAlumnos);

            if (querySnapshot.empty) {
                tbodyOrigen.innerHTML = `<tr><td colspan="4" style="padding:20px; text-align:center; color:#64748b;">No hay alumnos inscritos.</td></tr>`;
                return;
            }

            for (const documento of querySnapshot.docs) {
                const alumnoData = documento.data();
                
                const qPrevias = query(
                    collection(db, "previas"),
                    where("dni", "==", alumnoData.dni),
                    where("estado", "==", "Pendiente")
                );
                const previasSnapshot = await getDocs(qPrevias);
                
                const listaPrevias = [];
                previasSnapshot.forEach(pDoc => {
                    const dataPrevia = pDoc.data();
                    listaPrevias.push(`${dataPrevia.materia} (${dataPrevia.anioOrigen || 'Prev.'})`);
                });

                const esRegular = listaPrevias.length <= 4;
                const textoPopover = listaPrevias.length > 0 
                    ? `Debe ${listaPrevias.length} materia(s): ${listaPrevias.join(", ")}.`
                    : "Sin materias pendientes.";

                const alumnoObjeto = {
                dni: alumnoData.dni,
                nombre: alumnoData.nombre,
                esRegular: esRegular,
                textoPopover: textoPopover,
                cursoOrigenId: cursoId
            };


                alumnosOrigenCargados.push(alumnoObjeto);
                renderizarFilaAlumno(alumnoObjeto);
            }
        } catch (error) {
            console.error("Error al cargar alumnos:", error);
        }
    }

    function renderizarFilaAlumno(alumno) {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";

        const badgeEstilo = alumno.esRegular 
            ? "background-color: #d1fae5; color: #065f46;" 
            : "background-color: #fee2e2; color: #991b1b; cursor: help;";
        const badgeTexto = alumno.esRegular ? "Regular" : "Irregular";
        const claseBadge = alumno.esRegular ? "" : "badge-irregular-dinamico";

        tr.innerHTML = `
            <td style="padding: 10px; text-align: center;">
                <input type="checkbox" class="check-alumno" value="${alumno.dni}" style="cursor: pointer;">
            </td>
            <td style="padding: 10px; font-family: monospace;">${alumno.dni}</td>
            <td style="padding: 10px; font-weight: 500;">${alumno.nombre}</td>
            <td style="padding: 10px; text-align: right;">
                <span class="${claseBadge}" style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 12px; ${badgeEstilo}">${badgeTexto}</span>
            </td>
        `;

        if (!alumno.esRegular) {
            const badgeElement = tr.querySelector(".badge-irregular-dinamico");
            badgeElement.addEventListener("mouseenter", (e) => {
                popoverContenido.textContent = alumno.textoPopover;
                popover.style.display = "block";
                popover.style.left = (e.clientX + 15) + "px";
                popover.style.top = (e.clientY + 15) + "px";
            });
            badgeElement.addEventListener("mousemove", (e) => {
                popover.style.left = (e.clientX + 15) + "px";
                popover.style.top = (e.clientY + 15) + "px";
            });
            badgeElement.addEventListener("mouseleave", () => {
                popover.style.display = "none";
            });
        }

        tbodyOrigen.appendChild(tr);
    }

    selectCursoOrigen.addEventListener("change", cargarAlumnosOrigen);
    selectAnioOrigen.addEventListener("change", cargarAlumnosOrigen);
        checkTodosOrigen.addEventListener("change", () => {
        const checkboxes = tbodyOrigen.querySelectorAll(".check-alumno");
        checkboxes.forEach(cb => cb.checked = checkTodosOrigen.checked);
    });
// Actualización reactiva de la tabla derecha cuando cambia el curso destino
    selectCursoDestino.addEventListener("change", () => {
        const nuevoCursoId = selectCursoDestino.value;
        const nuevoCursoTexto = selectCursoDestino.options[selectCursoDestino.selectedIndex]?.text || "";

        // Buscamos todas las filas de alumnos cargadas en la tabla de destino
        const filasDestino = tbodyDestino.querySelectorAll("tr[data-dni]");
        
        filasDestino.forEach(tr => {
            // Verificamos si la fila corresponde a un alumno regular (Promoción)
            const esPromocion = tr.innerHTML.includes("Promoción");
            
            if (esPromocion) {
                // Actualizamos el atributo interno para Firebase
                tr.setAttribute("data-curso-destino", nuevoCursoId);
                
                // Actualizamos visualmente el texto de la tercera columna (Curso Destino)
                const celdas = tr.querySelectorAll("td");
                if (celdas.length >= 3) {
                    celdas[2].innerText = nuevoCursoTexto;
                }
            }
        });
    });
   btnPromocionar.addEventListener("click", () => {
    const cursoDestinoIdSeleccionado = selectCursoDestino.value;
    const cursoDestinoTextoSeleccionado = selectCursoDestino.options[selectCursoDestino.selectedIndex]?.text || "";

    // Recuperamos el texto usando la variable global correcta ya existente
    const cursoOrigenTexto = selectCursoOrigen.options[selectCursoOrigen.selectedIndex]?.text || "";

    const checkboxesSeleccionados = tbodyOrigen.querySelectorAll(".check-alumno:checked");


    if (checkboxesSeleccionados.length === 0) {

            alert("Por favor, seleccione al menos un alumno para promocionar.");
            return;
        }

        if (filaVaciaDestino) filaVaciaDestino.style.display = "none";

            checkboxesSeleccionados.forEach(cb => {
        const dni = cb.value;
        const alumnoData = alumnosOrigenCargados.find(a => a.dni === dni);

        if (!alumnoData) return;

        const yaExiste = tbodyDestino.querySelector(`[data-dni="${dni}"]`);
        if (!yaExiste) {
            // Decidimos curso e indicadores según la regularidad académica
            let cursoFinalId = "";
            let cursoFinalTexto = "";
            let badgeHtml = "";

            if (alumnoData.esRegular) {
                cursoFinalId = cursoDestinoIdSeleccionado;
                cursoFinalTexto = cursoDestinoTextoSeleccionado;
                badgeHtml = `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 12px; background-color: #dcfce7; color: #16a34a;">Promoción</span>`;
            } else {
                cursoFinalId = alumnoData.cursoOrigenId;
                cursoFinalTexto = cursoOrigenTexto;
                badgeHtml = `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 12px; background-color: #ffedd5; color: #ea580c;">Permanencia</span>`;
            }

            const tr = document.createElement("tr");
            tr.setAttribute("data-dni", dni);
            tr.setAttribute("data-curso-destino", cursoFinalId); // Atributo clave para el guardado final
            tr.style.borderBottom = "1px solid #f1f5f9";
            tr.innerHTML = `
                <td style="padding: 10px; font-family: monospace;">${dni}</td>
                <td style="padding: 10px; font-weight: 500;">${alumnoData.nombre}</td>
                <td style="padding: 10px; color: #475569;">${cursoFinalTexto}</td>
                <td style="padding: 10px; text-align: right;">
                    ${badgeHtml}
                </td>
                <td style="padding: 10px; text-align: right;">
                    <button class="btn-retornar" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px; padding: 0 5px; font-weight: bold;" title="Quitar de la lista">✕</button>
                </td>
            `;

            tr.querySelector(".btn-retornar").addEventListener("click", () => {
                tr.remove();
                const cbOrigen = tbodyOrigen.querySelector(`.check-alumno[value="${dni}"]`);
                if (cbOrigen) {
                    cbOrigen.checked = false;
                }
                if (tbodyDestino.querySelectorAll("tr:not(#fila-vacia-destino)").length === 0 && filaVaciaDestino) {
                    filaVaciaDestino.style.display = "table-row";
                }
            });

            tbodyDestino.appendChild(tr);

        }
    });

    });
    btnGuardarCambios.addEventListener("click", async () => {
    const anioOrigen = selectAnioOrigen.value;
    const cursoOrigenTexto = selectCursoOrigen.options[selectCursoOrigen.selectedIndex]?.text || "";
    const anioDestino = selectAnioDestino.value;
    const cursoDestinoId = selectCursoDestino.value;
    const cursoDestinoTexto = selectCursoDestino.options[selectCursoDestino.selectedIndex]?.text || "";
    const filasPromovidas = tbodyDestino.querySelectorAll("tr[data-dni]");

    if (!anioDestino || !cursoDestinoId) {
        await mostrarModalSistema("Control de seguridad", "Debe seleccionar el Año y Curso de destino antes de guardar.");
        return;
    }

    if (filasPromovidas.length === 0) {
        await mostrarModalSistema("Control de seguridad", "No hay alumnos en la lista de destino para ser guardados.");
        return;
    }

    if (parseInt(anioDestino, 10) <= parseInt(anioOrigen, 10)) {
        await mostrarModalSistema("Error de coherencia escolar", `El Año de Destino (${anioDestino}) debe ser estrictamente MAYOR al Año de Origen (${anioOrigen}).`);
        return;
    }

    const mensajeConfirmacion = `Está por traspasar de forma definitiva un lote de ${filasPromovidas.length} alumno(s) en el sistema. ¿Desea continuar?`;
    const confirmaGuardado = await mostrarModalSistema("⚠️ ADVERTENCIA DE PROMOCIÓN MASIVA ⚠️", mensajeConfirmacion, true);
    if (!confirmaGuardado) return;

    // Bloqueamos controles y mostramos cartel verde de procesamiento
    const cartelProcesando = document.getElementById("cartel-procesando");
    const btnVolverPanel = document.getElementById("btn-volver-panel");

    if (cartelProcesando) cartelProcesando.style.display = "flex";
    if (btnPromocionar) btnPromocionar.disabled = true;
    if (btnGuardarCambios) btnGuardarCambios.disabled = true;
    if (btnVolverPanel) btnVolverPanel.disabled = true;

    try {
        const batch = writeBatch(db);

        filasPromovidas.forEach(fila => {
            const dni = fila.getAttribute("data-dni");
            const alumnoRef = doc(db, "alumnos", dni);

            batch.update(alumnoRef, {
                cicloLectivo: anioDestino,
                cursoId: cursoDestinoId
            });
        });

        await batch.commit();

        // Ocultamos cartel y rehabilitamos botones al tener éxito
        if (cartelProcesando) cartelProcesando.style.display = "none";
        if (btnPromocionar) btnPromocionar.disabled = false;
        if (btnGuardarCambios) btnGuardarCambios.disabled = false;
        if (btnVolverPanel) btnVolverPanel.disabled = false;

        await mostrarModalSistema("Sincronización Exitosa", "¡Promoción masiva ejecutada con éxito! Los alumnos han sido actualizados.");

        tbodyDestino.innerHTML = '';
        if (filaVaciaDestino) filaVaciaDestino.style.display = "table-row";
        await cargarAlumnosOrigen();

    } catch (error) {
        // En caso de error, también ocultamos el cartel y rehabilitamos para permitir reintentar
        if (cartelProcesando) cartelProcesando.style.display = "none";
        if (btnPromocionar) btnPromocionar.disabled = false;
        if (btnGuardarCambios) btnGuardarCambios.disabled = false;
        if (btnVolverPanel) btnVolverPanel.disabled = false;

        console.error("Error crítico en proceso Batch:", error);
        await mostrarModalSistema("Error del sistema", "No se pudieron guardar los cambios en la base de datos.");
    }
});



})();
