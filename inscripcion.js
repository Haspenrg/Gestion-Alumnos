(function() {
    'use strict';

    // Elementos de la interfaz y selectores avanzados originales
    const formInscripcion = document.getElementById('formInscripcion');
    const tbodyAlumnos = document.getElementById('tablaAlumnosBody');
    const selectCursoFiltro = document.getElementById('filtroCursoEstructural');
    const btnLoteInforme = document.getElementById('btnEmitirLoteInforme');
    const btnLoteBoletin = document.getElementById('btnEmitirLoteBoletin');

    // Elementos del Modal de Impresión originales
    const modalContenedor = document.getElementById('modalImpresionContenedor');
    const modalCuerpo = document.getElementById('modalImpresionCuerpo');
    const btnCerrarModal = document.getElementById('btnCerrarModalImpresion');

    // Variables de contexto de sesión y almacenamiento temporal de archivos
    let usuarioLogueado = null;
    let rolNormalizado = "";
    
    // Objeto de persistencia digital expandido con la llave de inclusión pactada
    let base64DocumentosTemporales = {
        dni_alumno: null,
        partida_nac: null,
        cert_primaria: null,
        buena_salud: null,
        carnet_vacunas: null,
        dni_tutor: null,
        acta_ppi: null
    };

    document.addEventListener("DOMContentLoaded", async function() {
        const datosSesionRaw = localStorage.getItem('usuarioActivo');
        if (!datosSesionRaw) {
            window.location.href = "index.html";
            return;
        }

        usuarioLogueado = JSON.parse(datosSesionRaw);
        rolNormalizado = usuarioLogueado.rol.toLowerCase().trim();

        if (rolNormalizado === "preceptor") {
            const formulario = document.getElementById('contenedorFormularioAlta');
            const banner = document.getElementById('bannerPreceptor');
            if (formulario) formulario.style.display = "none";
            if (banner) banner.style.display = "block";
        }

        // 1. CÁLCULO Y ENFOQUE PERPETUO DEL CICLO LECTIVO ACTUAL
        inicializarCiclosLectivosDinamicos();

        await inicializarSelectoresCursos();
        await procesarFiltrosYNomina();
        inicializarManejadoresArchivosDigitales();
        inicializarManejadorReactivoPPI();

        if (formInscripcion) formInscripcion.addEventListener('submit', guardarLegajoDigital);
        document.getElementById('btnCancelarEdicion')?.addEventListener('click', salirModoEdicion);
        document.getElementById('filtroCicloLectivo').addEventListener('change', procesarFiltrosYNomina);
        document.getElementById('filtroBusquedaRapida').addEventListener('input', procesarFiltrosYNomina);
        document.getElementById('filtroEstadoMatricula').addEventListener('change', procesarFiltrosYNomina);
        document.getElementById('filtroAuditoriaDocs').addEventListener('change', procesarFiltrosYNomina);
        document.getElementById('filtroPPI')?.addEventListener('change', procesarFiltrosYNomina);

        if (selectCursoFiltro) {
            selectCursoFiltro.addEventListener('change', () => {
                gestionarHabilitacionBotoneraLote();
                procesarFiltrosYNomina();
            });
        }

        btnLoteInforme?.addEventListener('click', () => emitirDocumentosEnLote('INFORME'));
        btnLoteBoletin?.addEventListener('click', () => emitirDocumentosEnLote('BOLETIN'));
        btnCerrarModal?.addEventListener('click', cerrarModalPrevisualizacion);
        document.getElementById('estadoAlumno')?.addEventListener('change', evaluarEstadoMesaEntrada);
    });

    // --- AUTOMATIZACIÓN DE CICLOS LECTIVOS ---
    function inicializarCiclosLectivosDinamicos() {
        const selectorCiclo = document.getElementById('filtroCicloLectivo');
        if (!selectorCiclo) return;

        const anioActual = new Date().getFullYear(); // Captura el año civil dinámicamente
        const anioSiguiente = anioActual + 1;

        selectorCiclo.innerHTML = "";
        
        const opcionActual = new Option(`Ciclo ${anioActual}`, `${anioActual}`);
        const opcionSiguiente = new Option(`Ciclo ${anioSiguiente}`, `${anioSiguiente}`);

        selectorCiclo.add(opcionActual);
        selectorCiclo.add(opcionSiguiente);

        // Foco automático en el año real actual del sistema de preceptoría
        selectorCiclo.value = `${anioActual}`;
    }

    // --- CONTROL REACTIVO DE INCLUSIÓN (PPI) ---
    function inicializarManejadorReactivoPPI() {
        const checkboxPPI = document.getElementById('chkHabilitarPPI');
        const panelPPI = document.getElementById('panelCamposPPI');
        const filaDocPPI = document.getElementById('filaDocumentoPPI');

        if (!checkboxPPI || !panelPPI || !filaDocPPI) return;

        checkboxPPI.addEventListener('change', function() {
            if (this.checked) {
                panelPPI.style.display = 'flex';
                filaDocPPI.style.display = 'grid'; // Despliega como bloque digital de tu tabla
                document.getElementById('ppiResolucion').setAttribute('required', 'true');
            } else {
                panelPPI.style.display = 'none';
                filaDocPPI.style.display = 'none';
                document.getElementById('ppiResolucion').removeAttribute('required');
                
                // Limpieza absoluta si se destilda el casillero
                document.getElementById('ppiResolucion').value = "";
                document.getElementById('ppiMaestroApoyo').value = "";
                document.getElementById('ppiObservaciones').value = "";
                base64DocumentosTemporales.acta_ppi = null;
                actualizarFilaUIArchivo('acta_ppi', null);
            }
        });
    }

    // --- ARQUITECTURA DIGITAL DE ARCHIVOS CON VACIADO SEGURO ---
    function inicializarManejadoresArchivosDigitales() {
        const inputsArchivos = document.querySelectorAll('.input-archivo-oculto');
        inputsArchivos.forEach(input => {
            input.addEventListener('click', function(e) {
                const key = this.getAttribute('data-key');
                if (base64DocumentosTemporales[key]) {
                    e.preventDefault(); 
                    const confirmarEliminacion = confirm(`Atención:\nYa se encuentra cargado un documento en este casillero.\n\n¿Desea eliminar el archivo por completo y dejar el casillero vacío?`);
                    if (confirmarEliminacion) {
                        base64DocumentosTemporales[key] = null;
                        actualizarFilaUIArchivo(key, null);
                    }
                }
            });

            input.addEventListener('change', function(e) {
                const archivo = e.target.files[0];
                const key = this.getAttribute('data-key');
                if (!archivo) return;

                const limiteMaximoBytes = 1024 * 1024;
                if (archivo.size > limiteMaximoBytes) {
                    alert(`Error de tamaño:\nEl archivo supera el límite de 1MB establecido para el resguardo de la memoria.\nPor favor, optimice el archivo.`);
                    this.value = "";
                    return;
                }

                const lectorBinario = new FileReader();
                lectorBinario.onload = function(evt) {
                    const stringBase64Final = evt.target.result;
                    base64DocumentosTemporales[key] = stringBase64Final;
                    actualizarFilaUIArchivo(key, stringBase64Final, archivo.name);
                };
                lectorBinario.readAsDataURL(archivo);
                this.value = "";
            });
        });
    }

    function actualizarFilaUIArchivo(key, base64Data, nombreArchivo = "documento") {
        const chk = document.getElementById(`chk-${key}`);
        if (chk) chk.checked = !!base64Data;

        const btnVer = document.getElementById(`view-${key}`);
        if (btnVer) {
            if (base64Data) {
                btnVer.disabled = false;
                btnVer.onclick = function() {
                    abrirDocumentoPestanaNueva(base64Data, nombreArchivo);
                };
            } else {
                btnVer.disabled = true;
                btnVer.onclick = null;
            }
        }
    }

    function abrirDocumentoPestanaNueva(base64Data, nombreArchivo) {
        const ventanaEmergente = window.open();
        if (!ventanaEmergente) {
            alert("Error: Autorice los pop-ups en el navegador para visualizar documentos.");
            return;
        }
        ventanaEmergente.document.write(`
            <html>
            <head><title>Previsualización: ${nombreArchivo}</title></head>
            <body style="margin:0; background:#0f172a; display:flex; justify-content:center; align-items:center; min-height:100vh;">
                ${base64Data.startsWith("data:application/pdf") ? `<iframe src="${base64Data}" style="width:100vw; height:100vh; border:none;"></iframe>` : `<img src="${base64Data}" style="max-width:95%; max-height:95vh; object-fit:contain;">`}
            </body>
            </html>
        `);
        ventanaEmergente.document.close();
    }
    function evaluarEstadoMesaEntrada() {
        const estado = document.getElementById('estadoAlumno').value;
        const selectCurso = document.getElementById('selectCursoAlumno');
        if (!selectCurso) return;
        if (estado === "Entrante") {
            selectCurso.removeAttribute('required');
            selectCurso.disabled = true;
            selectCurso.value = "";
        } else {
            selectCurso.setAttribute('required', 'true');
            selectCurso.disabled = false;
        }
    }

    async function inicializarSelectoresCursos() {
        const coursesRaw = localStorage.getItem('cursosColegio');
        const cursos = coursesRaw ? JSON.parse(coursesRaw) : [];
        const selectForm = document.getElementById('selectCursoAlumno');
        if (!selectForm || !selectCursoFiltro) return;

        selectForm.innerHTML = '<option value="" disabled selected>Seleccione el curso destino...</option>';
        selectCursoFiltro.innerHTML = '<option value="">Todos los Cursos</option>';

        cursos.forEach(curso => {
            const texto = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
            selectForm.add(new Option(texto, curso.id));
            const numeroAnio = curso.ciclo ? curso.ciclo.charAt(0) : "1";
            selectCursoFiltro.add(new Option(`${numeroAnio} ° "${curso.division}"`, curso.id));
        });
    }

    function gestionarHabilitacionBotoneraLote() {
        const cursoSeleccionado = selectCursoFiltro.value;
        const deshabilitar = (cursoSeleccionado === "");
        if (btnLoteInforme) btnLoteInforme.disabled = deshabilitar;
        if (btnLoteBoletin) btnLoteBoletin.disabled = deshabilitar;
    }

    async function procesarFiltrosYNomina() {
        if (!tbodyAlumnos) return;
        const alumnosRaw = localStorage.getItem('alumnosColegio');
        let alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];
        const cursosRaw = localStorage.getItem('cursosColegio');
        const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];

        const ciclo = document.getElementById('filtroCicloLectivo').value;
        const busqueda = document.getElementById('filtroBusquedaRapida').value.toLowerCase().trim();
        const cursoFiltro = selectCursoFiltro.value;
        const estadoFiltro = document.getElementById('filtroEstadoMatricula').value;
        const docFiltro = document.getElementById('filtroAuditoriaDocs').value;
        const ppiFiltro = document.getElementById('filtroPPI')?.value || "";

        const totalNetoCicloLectivo = alumnos.filter(a => a.cicloLectivo === ciclo).length;

        if (rolNormalizado === "preceptor") {
            const usuariosRaw = localStorage.getItem('usuariosColegio');
            const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
            const preceptorReal = usuarios.find(u => u.dni === usuarioLogueado.dni);
            const cursosAsignados = preceptorReal ? (preceptorReal.cursosAsignados || []) : [];
            alumnos = alumnos.filter(a => cursosAsignados.includes(a.cursoId) && (a.estado === "Regular" || a.estado === "Entrante"));
        }

        let alumnosFiltrados = alumnos.filter(alumno => {
            if (alumno.cicloLectivo !== ciclo) return false;
            if (cursoFiltro && alumno.cursoId !== cursoFiltro) return false;
            if (estadoFiltro && alumno.estado !== estadoFiltro) return false;

            // Filtro elástico para alumnos con PPI sin romper UI
            if (ppiFiltro) {
                const tienePPI = !!alumno.tienePPI;
                if (ppiFiltro === "ConPPI" && !tienePPI) return false;
                if (ppiFiltro === "SinPPI" && tienePPI) return false;
            }

            if (docFiltro) {
                const dMap = alumno.documentosDigitales || {};
                const totalRequisitosBase = 6;
                const cargadosBase = ['dni_alumno', 'partida_nac', 'cert_primaria', 'buena_salud', 'carnet_vacunas', 'dni_tutor']
                    .filter(k => dMap[k] !== null && dMap[k] !== undefined).length;
                
                const esCompleto = cargadosBase === totalRequisitosBase;
                if (docFiltro === "Completo" && !esCompleto) return false;
                if (docFiltro === "Incompleto" && esCompleto) return false;
            }

            if (busqueda) {
                const mNombre = alumno.nombre.toLowerCase().includes(busqueda);
                const mDni = alumno.dni.includes(busqueda);
                if (!mNombre && !mDni) return false;
            }
            return true;
        });

        const totalGeneralSpan = document.getElementById('contadorEstudiantes');
        if (totalGeneralSpan) {
            totalGeneralSpan.textContent = `Matrículas Visualizadas: ${alumnosFiltrados.length}`;
        }

        tbodyAlumnos.innerHTML = "";
        if (alumnosFiltrados.length === 0) {
            tbodyAlumnos.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:25px;">No se encontraron legajos con los criterios seleccionados.</td></tr>`;
            return;
        }

        alumnosFiltrados.forEach(alumno => {
            const tr = document.createElement('tr');
            tr.className = "fila-alumno";
            tr.style.borderBottom = "1px solid #cbd5e1";

            if (rolNormalizado !== "preceptor") {
                tr.addEventListener('click', (e) => {
                    if (e.target.tagName !== "BUTTON") cargarLegajoEnFormulario(alumno.dni);
                });
            }

            const curso = cursos.find(c => c.id === alumno.cursoId);
            const textoCurso = curso ? `${curso.ciclo.charAt(0)} ° "${curso.division}"` : "Sin Asignar";
            const dMap = alumno.documentosDigitales || {};
            
            const baseCargados = ['dni_alumno', 'partida_nac', 'cert_primaria', 'buena_salud', 'carnet_vacunas', 'dni_tutor']
                .filter(k => dMap[k] !== null && dMap[k] !== undefined).length;
            
            const ppiCargado = alumno.tienePPI && dMap.acta_ppi ? 1 : 0;
            const totalDocs = baseCargados + ppiCargado;
            const totalRequisitosEsperados = alumno.tienePPI ? 7 : 6;

            const auditoriaHtml = totalDocs >= totalRequisitosEsperados
                ? `<span class="documentos-completos">✓ Legajo Completo</span>`
                : `<span class="alerta-documentos">⚠ Incompleto (${totalDocs}/${totalRequisitosEsperados})</span>`;

            let badgeEstado = `<span class="badge-curso">${alumno.estado}</span>`;
            if (alumno.estado === "Pase") badgeEstado = `<span class="badge-pase">Pase</span>`;
            if (alumno.estado === "Baja") badgeEstado = `<span class="badge-baja">Baja</span>`;

            let celdaAccionesHTML = `<div style="display:flex; gap:4px; justify-content:center;">`;
            if (alumno.estado === "Regular") {
                celdaAccionesHTML += `
                    <button type="button" class="btn-accion-fila btn-fila-informe" onclick="emitirDocumentoIndividual('${alumno.dni}', 'INFORME')" title="Informe">📊</button>
                    <button type="button" class="btn-accion-fila btn-fila-boletin" onclick="emitirDocumentoIndividual('${alumno.dni}', 'BOLETIN')" title="Boletín">📜</button>
                `;
            }

            if (rolNormalizado !== "preceptor") {
                celdaAccionesHTML += `<button type="button" class="btn-accion-fila" onclick="removerLegajoAlumno('${alumno.dni}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; font-weight:bold; border-radius:4px;">Eliminar</button>`;
            } else if (alumno.estado !== "Regular") {
                celdaAccionesHTML += `<span style="color:#94a3b8; font-size:11px;">Solo Vista</span>`;
            }
            celdaAccionesHTML += `</div>`;

            // CONSERVA EXACTAMENTE TUS FILAS ORIGINALES SIN CAMBIAR TU ESTILO VISUAL DE TABLA
            tr.innerHTML = `
                <td>
                    <strong style="font-size: 14px; color: #1e293b;">${alumno.nombre}</strong><br>
                    <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">DNI: ${alumno.dni} | Nac: ${alumno.nacionalidad}</span>
                </td>
                <td style="vertical-align: middle;"><span class="badge-curso">${textoCurso}</span></td>
                <td style="vertical-align: middle;">${badgeEstado}</td>
                <td style="vertical-align: middle;">${auditoriaHtml}</td>
                <td style="vertical-align: middle;">${celdaAccionesHTML}</td>
            `;
            tbodyAlumnos.appendChild(tr);
        });
    }

    window.emitirDocumentoIndividual = function(dni, tipo) {
        const alumnosRaw = localStorage.getItem('alumnosColegio');
        const alumno = (alumnosRaw ? JSON.parse(alumnosRaw) : []).find(a => a.dni === dni);
        if (!alumno) return;
        configurarEstiloPaginaPorTipo(tipo);
        modalCuerpo.innerHTML = construirHTMLHojaDocumento(alumno, tipo);
        if (modalContenedor) modalContenedor.style.display = "flex";
    };

    async function emitirDocumentosEnLote(tipo) {
        const cursoId = selectCursoFiltro.value;
        if (!cursoId) return;
        const alumnosRaw = localStorage.getItem('alumnosColegio');
        const ciclo = document.getElementById('filtroCicloLectivo').value;

        let listaAlumnos = (alumnosRaw ? JSON.parse(alumnosRaw) : []).filter(a =>
            a.cursoId === cursoId && a.estado === "Regular" && a.cicloLectivo === ciclo
        );

        if (listaAlumnos.length === 0) {
            alert("No hay alumnos Regulares en esta división.");
            return;
        }
        listaAlumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));
        configurarEstiloPaginaPorTipo(tipo);

        let htmlAcumulado = "";
        listaAlumnos.forEach(alumno => { htmlAcumulado += construirHTMLHojaDocumento(alumno, tipo); });
        modalCuerpo.innerHTML = htmlAcumulado;
        if (modalContenedor) modalContenedor.style.display = "flex";
    }

    function configurarEstiloPaginaPorTipo(tipo) {
        let styleTag = document.getElementById('printPageOrientationStyle') || document.createElement('style');
        styleTag.id = 'printPageOrientationStyle';
        document.head.appendChild(styleTag);
        styleTag.innerHTML = `@media print { @page { size: ${tipo === 'BOLETIN' ? 'A4 portrait' : 'A4 landscape'}; } }`;
    }

    function construirHTMLHojaDocumento(alumno, tipo) {
        const cursosRaw = localStorage.getItem('cursosColegio');
        const cursoObj = (cursosRaw ? JSON.parse(cursosRaw) : []).find(c => c.id === alumno.cursoId) || {};
        const materiasPlan = cursoObj.materias || [];
        const notasRaw = localStorage.getItem('calificacionesColegio');
        const registroGlobalNotas = notasRaw ? JSON.parse(notasRaw) : [];
        const anioNumero = cursoObj.ciclo ? cursoObj.ciclo.charAt(0) : "1";
        const txtCursoVisible = `${anioNumero} ° "${cursoObj.division}" (${cursoObj.turno})`;

        let claseHoja = (tipo === 'BOLETIN') ? "contenedor-hoja-pdf hoja-formato-boletin" : "contenedor-hoja-pdf";
        let html = `<div class="${claseHoja}">`;
        
        html += `
            <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
                <h2 style="margin:0; font-size:16px; text-transform:uppercase;">${tipo === 'BOLETIN' ? 'Boletín de Calificaciones Oficial' : 'Informe Pedagógico'}</h2>
                <span style="font-size:11px;">Ciclo Lectivo: ${alumno.cicloLectivo}</span>
            </div>
            <div style="font-size:12px; margin-bottom:15px; border:1px solid #000; padding:10px;">
                <strong>Alumno:</strong> ${alumno.nombre.toUpperCase()} | <strong>DNI:</strong> ${alumno.dni} | <strong>Curso:</strong> ${txtCursoVisible}
            </div>
            <table class="tabla-hoja-documento">
                <thead><tr><th style="text-align:left;">Asignatura</th><th>Final</th></tr></thead>
                <tbody>
        `;

        materiasPlan.forEach(materia => {
            const p = registroGlobalNotas.find(n => n.alumnoDni === alumno.dni && n.cursoId === alumno.cursoId && n.materia === materia) || {};
            html += `<tr><td style="text-align:left;">${materia}</td><td>${p.febrero || p.diciembre || "-"}</td></tr>`;
        });

        html += `</tbody></table></div>`;
        return html;
    }

    function cerrarModalPrevisualizacion() {
        if (modalContenedor) modalContenedor.style.display = "none";
        modalCuerpo.innerHTML = "";
    }

    async function guardarLegajoDigital(e) {
        e.preventDefault();
        const idEdicion = document.getElementById('idOriginalEdicion').value;
        const dni = document.getElementById('dniAlumno').value.trim();
        const cicloActual = document.getElementById('filtroCicloLectivo').value;

        const alumnosRaw = localStorage.getItem('alumnosColegio');
        let alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];

        if (!idEdicion && alumnos.some(a => a.dni === dni)) {
            alert("Error: El número de DNI ya está registrado.");
            return;
        }

        const datosLegajo = {
            dni: dni,
            cuil: document.getElementById('cuilAlumno').value.trim(),
            nombre: document.getElementById('nombreAlumno').value.trim(),
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            lugarNacimiento: document.getElementById('lugarNacimiento').value.trim(),
            nacionalidad: document.getElementById('nacionalidad').value.trim(),
            cursoId: document.getElementById('selectCursoAlumno').value,
            estado: document.getElementById('estadoAlumno').value,
            direccion: document.getElementById('direccionAlumno').value.trim(),
            telefono: document.getElementById('telefonoAlumno').value.trim(),
            telefonoAlternativo: document.getElementById('telefonoAlternativo').value.trim(),
            escuelaProcedencia: document.getElementById('escuelaProcedencia').value.trim(),
            tutorNombre: document.getElementById('nombreTutor').value.trim(),
            tutorDni: document.getElementById('dniTutor').value.trim(),
            observaciones: document.getElementById('observacionesAlumno').value.trim(),
            cicloLectivo: cicloActual,
            
            // Persistencia del estado e inputs del PPI (Preparado para Firebase)
            tienePPI: document.getElementById('chkHabilitarPPI').checked,
            ppiDatos: {
                resolucion: document.getElementById('ppiResolucion').value.trim(),
                maestroApoyo: document.getElementById('ppiMaestroApoyo').value.trim(),
                observaciones: document.getElementById('ppiObservaciones').value.trim()
            },
            documentosDigitales: { ...base64DocumentosTemporales }
        };

        if (idEdicion) {
            const idx = alumnos.findIndex(a => a.dni === idEdicion);
            if (idx !== -1) {
                const dHistorico = alumnos[idx].documentosDigitales || {};
                for (let k in datosLegajo.documentosDigitales) {
                    if (!datosLegajo.documentosDigitales[k]) datosLegajo.documentosDigitales[k] = dHistorico[k] || null;
                }
                alumnos[idx] = datosLegajo;
            }
        } else {
            alumnos.push(datosLegajo);
        }

        localStorage.setItem('alumnosColegio', JSON.stringify(alumnos));
        alert(idEdicion ? "Legajo actualizado." : "Estudiante matriculado.");
        salirModoEdicion();
        await procesarFiltrosYNomina();
    }

    function cargarLegajoEnFormulario(dni) {
        const alumnosRaw = localStorage.getItem('alumnosColegio');
        const alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];
        const alumno = alumnos.find(a => a.dni === dni);
        if (!alumno) return;

        document.getElementById('idOriginalEdicion').value = alumno.dni;
        document.getElementById('formTitulo').textContent = "Editar Legajo de Alumno";
        document.getElementById('bannerEdicion').style.display = "block";

        document.getElementById('nombreAlumno').value = alumno.nombre;
        document.getElementById('dniAlumno').value = alumno.dni;
        document.getElementById('cuilAlumno').value = alumno.cuil || "";
        document.getElementById('fechaNacimiento').value = alumno.fechaNacimiento;
        document.getElementById('lugarNacimiento').value = alumno.lugarNacimiento;
        document.getElementById('nacionalidad').value = alumno.nacionalidad;
        document.getElementById('selectCursoAlumno').value = alumno.cursoId;
        document.getElementById('estadoAlumno').value = alumno.estado;
        document.getElementById('direccionAlumno').value = alumno.direccion;
        document.getElementById('telefonoAlumno').value = alumno.telefono;
        document.getElementById('telefonoAlternativo').value = alumno.telefonoAlternativo || "";
        document.getElementById('escuelaProcedencia').value = alumno.escuelaProcedencia || "";
        document.getElementById('nombreTutor').value = alumno.tutorNombre || "";
        document.getElementById('dniTutor').value = alumno.tutorDni || "";
        document.getElementById('observacionesAlumno').value = alumno.observaciones || "";

        evaluarEstadoMesaEntrada();

        // Mapeo bidireccional histórico del nodo PPI al dar clic en la fila
        const checkPPI = document.getElementById('chkHabilitarPPI');
        if (checkPPI) {
            checkPPI.checked = !!alumno.tienePPI;
            const panelPPI = document.getElementById('panelCamposPPI');
            const filaDocPPI = document.getElementById('filaDocumentoPPI');
            if (alumno.tienePPI) {
                panelPPI.style.display = 'flex';
                filaDocPPI.style.display = 'grid';
                document.getElementById('ppiResolucion').value = alumno.ppiDatos?.resolucion || "";
                document.getElementById('ppiMaestroApoyo').value = alumno.ppiDatos?.maestroApoyo || "";
                document.getElementById('ppiObservaciones').value = alumno.ppiDatos?.observaciones || "";
            } else {
                panelPPI.style.display = 'none';
                filaDocPPI.style.display = 'none';
            }
        }

        const dMap = alumno.documentosDigitales || {};
        base64DocumentosTemporales = { ...dMap };
        
        const llavesRequisitos = ['dni_alumno', 'partida_nac', 'cert_primaria', 'buena_salud', 'carnet_vacunas', 'dni_tutor', 'acta_ppi'];
        llavesRequisitos.forEach(key => {
            actualizarFilaUIArchivo(key, base64DocumentosTemporales[key], `Historico_${key}`);
        });
    }

    function salirModoEdicion() {
        if (formInscripcion) formInscripcion.reset();
        document.getElementById('idOriginalEdicion').value = "";
        document.getElementById('formTitulo').textContent = "Matricular Estudiante";
        document.getElementById('bannerEdicion').style.display = "none";
        
        document.getElementById('panelCamposPPI').style.display = 'none';
        document.getElementById('filaDocumentoPPI').style.display = 'none';

        base64DocumentosTemporales = {
            dni_alumno: null,
            partida_nac: null,
            cert_primaria: null,
            buena_salud: null,
            carnet_vacunas: null,
            dni_tutor: null,
            acta_ppi: null
        };

        const llavesRequisitos = ['dni_alumno', 'partida_nac', 'cert_primaria', 'buena_salud', 'carnet_vacunas', 'dni_tutor', 'acta_ppi'];
        llavesRequisitos.forEach(key => {
            const chk = document.getElementById(`chk-${key}`);
            if (chk) chk.checked = false;
            const btnVer = document.getElementById(`view-${key}`);
            if (btnVer) {
                btnVer.disabled = true;
                btnVer.onclick = null;
            }
        });
        evaluarEstadoMesaEntrada();
    }

    window.removerLegajoAlumno = function(dni) {
        if (!confirm("¿Está seguro de eliminar este legajo por completo?")) return;
        const alumnosRaw = localStorage.getItem('alumnosColegio');
        let alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];
        alumnos = alumnos.filter(a => a.dni !== dni);
        localStorage.setItem('alumnosColegio', JSON.stringify(alumnos));
        procesarFiltrosYNomina();
    };

})();
