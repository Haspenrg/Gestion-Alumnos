(function() {
    'use strict';

    // Elementos de la interfaz y selectores avanzados
    const formInscripcion = document.getElementById('formInscripcion');
    const tbodyAlumnos = document.getElementById('tablaAlumnosBody');
    const selectCursoFiltro = document.getElementById('filtroCursoEstructural');
    const btnLoteInforme = document.getElementById('btnEmitirLoteInforme');
    const btnLoteBoletin = document.getElementById('btnEmitirLoteBoletin');

    // Elementos del Modal de Impresión
    const modalContenedor = document.getElementById('modalImpresionContenedor');
    const modalCuerpo = document.getElementById('modalImpresionCuerpo');
    const btnCerrarModal = document.getElementById('btnCerrarModalImpresion');

    // Variables de contexto de sesión y almacenamiento temporal de archivos
    let usuarioLogueado = null;
    let rolNormalizado = "";
    let base64DocumentosTemporales = {
        dni_alumno: null,
        partida_nac: null,
        cert_primaria: null,
        buena_salud: null,
        carnet_vacunas: null,
        dni_tutor: null
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

        await inicializarSelectoresCursos();
        await procesarFiltrosYNomina();
        inicializarManejadoresArchivosDigitales();

        if (formInscripcion) formInscripcion.addEventListener('submit', guardarLegajoDigital);
        document.getElementById('btnCancelarEdicion')?.addEventListener('click', salirModoEdicion);

        document.getElementById('filtroCicloLectivo').addEventListener('change', procesarFiltrosYNomina);
        document.getElementById('filtroBusquedaRapida').addEventListener('input', procesarFiltrosYNomina);
        document.getElementById('filtroEstadoMatricula').addEventListener('change', procesarFiltrosYNomina);
        document.getElementById('filtroAuditoriaDocs').addEventListener('change', procesarFiltrosYNomina);
        
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

    // --- INTEGRACIÓN: MANEJADOR DINÁMICO DE ARCHIVOS DIGITALES (FIX) ---
    function inicializarManejadoresArchivosDigitales() {
        const inputsArchivos = document.querySelectorAll('.input-archivo-oculto');
        
        inputsArchivos.forEach(input => {
            input.addEventListener('change', function(e) {
                const archivo = e.target.files[0];
                const key = this.getAttribute('data-key');
                if (!archivo) return;

                // Validación Coercitiva de Tamaño: 1 MB máximo (1024 * 1024 bytes)
                const limiteMaximoBytes = 1024 * 1024;
                if (archivo.size > limiteMaximoBytes) {
                    alert(`Error de tamaño:\nEl archivo supera el límite de 1MB establecido para resguardo de la memoria local.\nPor favor, optimice o reduzca el peso de la imagen.`);
                    this.value = ""; // Destruir selección
                    return;
                }

                const lectorBinario = new FileReader();
                lectorBinario.onload = function(evt) {
                    const stringBase64Final = evt.target.result;
                    
                    // Sincronizar memoria temporal del formulario y encender UI reactiva
                    base64DocumentosTemporales[key] = stringBase64Final;
                    
                    const chk = document.getElementById(`chk-${key}`);
                    if (chk) chk.checked = true;

                    const btnVer = document.getElementById(`view-${key}`);
                    if (btnVer) {
                        btnVer.disabled = false;
                        btnVer.onclick = function() {
                            abrirDocumentoPestanaNueva(stringBase64Final, archivo.name);
                        };
                    }
                };
                lectorBinario.readAsDataURL(archivo);
            });
        });
    }

    function abrirDocumentoPestanaNueva(base64Data, nombreArchivo) {
        const ventanaEmergente = window.open();
        if (!ventanaEmergente) {
            alert("Error: El navegador bloqueó la ventana emergente. Por favor, autorice los pop-ups para este sitio.");
            return;
        }
        
        // Crear un entorno HTML limpio e inyectar el binario directamente (Soporta PDF e Imágenes)
        ventanaEmergente.document.write(`
            <html>
            <head>
                <title>Previsualización: ${nombreArchivo}</title>
                <style>
                    body { margin: 0; background: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; }
                    img { max-width: 95%; max-height: 95vh; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 4px; object-fit: contain; }
                    iframe { width: 100vw; height: 100vh; border: none; }
                </style>
            </head>
            <body>
                ${base64Data.startsWith("data:application/pdf") 
                    ? `<iframe src="${base64Data}"></iframe>` 
                    : `<img src="${base64Data}" alt="Documentación Escolar Legal">`
                }
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
        const cursos = coursesRaw ? JSON.parse(cursosRaw) : [];
        const selectForm = document.getElementById('selectCursoAlumno');
        
        if (!selectForm || !selectCursoFiltro) return;
        selectForm.innerHTML = '<option value="" disabled selected>Seleccione el curso destino...</option>';
        selectCursoFiltro.innerHTML = '<option value="">Todos los Cursos</option>';

        cursos.forEach(curso => {
            const texto = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
            selectForm.add(new Option(texto, curso.id));
            const numeroAnio = curso.ciclo ? curso.ciclo.charAt(0) : "1";
            selectCursoFiltro.add(new Option(`${numeroAnio}° "${curso.division}"`, curso.id));
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
            if (docFiltro) {
                // Cálculo de legajo completo basado en la existencia de los strings Base64 digitalizados
                const dMap = alumno.documentosDigitales || {};
                const totalCargados = Object.values(dMap).filter(v => v !== null && v !== undefined).length;
                const esCompleto = totalCargados === 6;
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

        document.getElementById('contadorEstudiantes').innerHTML = `
            <span>Matrículas Visualizadas: <strong>${alumnosFiltrados.length}</strong></span>
            <span style="margin: 0 10px; color: #cbd5e1;">|</span>
            <span style="color: #1a73e8;">Total General Ciclo ${ciclo}: <strong>${totalNetoCicloLectivo}</strong></span>
        `;

        tbodyAlumnos.innerHTML = "";

        if (alumnosFiltrados.length === 0) {
            tbodyAlumnos.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:25px;">No se encontraron legajos con los criterios seleccionados.</td></tr>`;
            return;
        }

        alumnosFiltrados.forEach(alumno => {
            const tr = document.createElement('tr');
            tr.className = "fila-alumno";
            tr.style.borderBottom = "1px solid #e2e8f0";

            if (rolNormalizado !== "preceptor") {
                tr.addEventListener('click', (e) => {
                    if (e.target.tagName !== "BUTTON") cargarLegajoEnFormulario(alumno.dni);
                });
            }

            const curso = cursos.find(c => c.id === alumno.cursoId);
            const textoCurso = curso ? `${curso.ciclo.charAt(0)}° "${curso.division}"` : "Sin Asignar";
            
            const dMap = alumno.documentosDigitales || {};
            const totalDocs = Object.values(dMap).filter(v => v !== null && v !== undefined).length;

            const auditoriaHtml = totalDocs === 6
                ? `<span class="documentos-completos">✓ Legajo Completo</span>`
                : `<span class="alerta-documentos">⚠ Incompleto (${totalDocs}/6)</span>`;

            const badgeEstado = alumno.estado === "Regular"
                ? `<span class="badge-curso" style="background:#e2f0d9; color:#385723; border-color:#c3e6cb;">Regular</span>`
                : `<span class="badge-curso">${alumno.estado}</span>`;

            let celdaAccionesHTML = `<div style="display:flex; gap:4px; justify-content:center;">`;
            if (alumno.estado === "Regular") {
                celdaAccionesHTML += `
                    <button type="button" class="btn-accion-fila btn-fila-informe" onclick="emitirDocumentoIndividual('${alumno.dni}', 'INFORME')" title="Informe Pedagógico Analítico">📊</button>
                    <button type="button" class="btn-accion-fila btn-fila-boletin" onclick="emitirDocumentoIndividual('${alumno.dni}', 'BOLETIN')" title="Boletín de Calificaciones Oficial">📜</button>
                `;
            }
            if (rolNormalizado !== "preceptor") {
                celdaAccionesHTML += `<button type="button" class="btn-accion-eliminar" onclick="removerLegajoAlumno('${alumno.dni}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">Eliminar</button>`;
            } else if (alumno.estado !== "Regular") {
                celdaAccionesHTML += `<span style="color:#94a3b8; font-size:11px;">Solo Vista</span>`;
            }
            celdaAccionesHTML += `</div>`;

            tr.innerHTML = `
                <td style="padding: 12px 10px; vertical-align: top;">
                    <strong style="font-size: 14px; color: #1e293b;">${alumno.nombre}</strong><br>
                    <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">DNI: ${alumno.dni} | Nac: ${alumno.nacionalidad}</span>
                    <div style="margin-top: 6px; font-size: 11px; color: #475569;">
                        📍 <strong>Dir:</strong> ${alumno.direccion} | 👤 <strong>Tutor:</strong> ${alumno.tutorNombre || 'Sin Registrar'}
                    </div>
                </td>
                <td style="vertical-align: top; padding-top: 14px;"><span class="badge-curso">${textoCurso}</span></td>
                <td style="vertical-align: top; padding-top: 14px;">${badgeEstado}</td>
                <td style="vertical-align: top; padding-top: 14px;">${auditoriaHtml}</td>
                <td style="vertical-align: top; padding-top: 10px;">${celdaAccionesHTML}</td>
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

    async function emitirDocumentosEn Lote(tipo) {
        const cursoId = selectCursoFiltro.value;
        if (!cursoId) return;

        const alumnosRaw = localStorage.getItem('alumnosColegio');
        const ciclo = document.getElementById('filtroCicloLectivo').value;
        
        let listaAlumnos = (alumnosRaw ? JSON.parse(alumnosRaw) : []).filter(a => 
            a.cursoId === cursoId && a.estado === "Regular" && a.cicloLectivo === ciclo
        );

        if (listaAlumnos.length === 0) {
            alert("No hay alumnos Regulares inscritos en esta división para el ciclo actual.");
            return;
        }

        listaAlumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));
        configurarEstiloPaginaPorTipo(tipo);

        let htmlAcumulado = "";
        listaAlumnos.forEach(alumno => {
            htmlAcumulado += construirHTMLHojaDocumento(alumno, tipo);
        });

        modalCuerpo.innerHTML = htmlAcumulado;
        if (modalContenedor) modalContenedor.style.display = "flex";
    }

    function configurarEstiloPaginaPorTipo(tipo) {
        let styleTag = document.getElementById('printPageOrientationStyle');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'printPageOrientationStyle';
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = `@media print { @page { size: ${tipo === 'BOLETIN' ? 'A4 portrait' : 'A4 landscape'}; } }`;
    }

    function construirHTMLHojaDocumento(alumno, tipo) {
        const cursosRaw = localStorage.getItem('cursosColegio');
        const cursoObj = (cursosRaw ? JSON.parse(cursosRaw) : []).find(c => c.id === alumno.cursoId) || {};
        const materiasPlan = cursoObj.materias || [];

        const notasRaw = localStorage.getItem('calificacionesColegio');
        const registroGlobalNotas = notasRaw ? JSON.parse(notasRaw) : [];

        const anioNumero = cursoObj.ciclo ? cursoObj.ciclo.charAt(0) : "1";
        const txtCursoVisible = `${anioNumero}° "${cursoObj.division}" (${cursoObj.turno})`;

        let claseHoja = (tipo === 'BOLETIN') ? "contenedor-hoja-pdf hoja-formato-boletin" : "contenedor-hoja-pdf";

        let html = `<div class="${claseHoja}">`;
        
        html += `
            <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
                <h2 style="margin:0; font-size:16px; text-transform:uppercase;">${tipo === 'BOLETIN' ? 'Boletín de Calificaciones Oficial' : 'Informe Pedagógico de Trayectorias'}</h2>
                <h3 style="margin:5px 0 0 0; font-size:12px; font-weight:500;">Colegio Provincial "HASPEN" "Prof. Luis A. Felippa"</h3>
                <span style="font-size:11px;">Ciclo Lectivo: ${alumno.cicloLectivo} | Río Grande, Tierra del Fuego</span>
            </div>
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px; font-size:12px; margin-bottom:15px; border:1px solid #000; padding:10px;">
                <div><strong>Alumno:</strong> ${alumno.nombre.toUpperCase()}</div>
                <div><strong>D.N.I:</strong> ${alumno.dni}</div>
                <div><strong>Curso / División:</strong> ${txtCursoVisible}</div>
                <div><strong>Condición:</strong> ${alumno.estado}</div>
            </div>
        `;

        if (tipo === 'BOLETIN') {
            html += `
                <table class="tabla-hoja-documento">
                    <thead>
                        <tr>
                            <th style="width:40%; text-align:left;">Asignaturas Curriculares</th>
                            <th style="width:12%;">1er Cuat.</th>
                            <th style="width:12%;">2do Cuat.</th>
                            <th style="width:12%;">Nota Final</th>
                            <th style="width:12%;">Diciembre</th>
                            <th style="width:12%;">Febrero</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            materiasPlan.forEach(materia => {
                const p = registroGlobalNotas.find(n => n.alumnoDni === alumno.dni && n.cursoId === alumno.cursoId && n.materia === materia) || {};
                const n = p.notas || {};

                const c1 = calcularNotaFase(n.trim1?.n2, n.trim1?.ef);
                const c2 = calcularNotaFase(n.trim2?.n2, n.trim2?.ef);
                const notaFinal = c2 >= 6 ? c2 : (p.febrero || p.diciembre || "-");

                html += `
                    <tr>
                        <td style="text-align:left; font-weight:bold;">${materia.toUpperCase()}</td>
                        <td class="${obtenerClaseColorNota(c1)}">${c1}</td>
                        <td class="${obtenerClaseColorNota(c2)}">${c2}</td>
                        <td style="font-weight:bold;" class="${obtenerClaseColorNota(notaFinal)}">${notaFinal}</td>
                        <td class="${obtenerClaseColorNota(p.diciembre)}">${p.diciembre || "-"}</td>
                        <td class="${obtenerClaseColorNota(p.febrero)}">${p.febrero || "-"}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
                <div style="margin-top:20px; font-size:11px; font-style:italic; border:1px solid #000; padding:8px;">
                    <strong>OBSERVACIONES GENERALES:</strong> Por espacios curriculares adeudados comunicarse con Secretaría.
                </div>
                <div style="margin-top:70px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; text-align:center; font-size:11px;">
                    <div style="border-top:1px solid #000; padding-top:5px;">Firma del/la Estudiante</div>
                    <div style="border-top:1px solid #000; padding-top:5px;">Firma del/la Tutor/a</div>
                    <div style="border-top:1px solid #000; padding-top:5px;">Firma Autoridad Escolar</div>
                </div>
            `;
        } else {
            html += `
                <table class="tabla-hoja-documento">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width:25%; text-align:left;">Plan de Estudios</th>
                            <th colspan="4" style="background:#e6fffa !important;">1er Cuatrimestre</th>
                            <th colspan="4" style="background:#e8f0fe !important;">2do Cuatrimestre</th>
                            <th colspan="3" style="background:#fff8e1 !important;">Cierre Anual</th>
                        </tr>
                        <tr>
                            <th>1°Inf</th><th>2°Inf</th><th>E.Fort</th><th style="background:#cbd5e1 !important;">1°Cua</th>
                            <th>1°Inf</th><th>2°Inf</th><th>E.Fort</th><th style="background:#cbd5e1 !important;">2°Cua</th>
                            <th>Dic</th><th>Feb</th><th style="background:#cbd5e1 !important;">Def.</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            materiasPlan.forEach(materia => {
                const p = registroGlobalNotas.find(n => n.alumnoDni === alumno.dni && n.cursoId === alumno.cursoId && n.materia === materia) || {};
                const n = p.notas || {};

                const c1 = calcularNotaFase(n.trim1?.n2, n.trim1?.ef);
                const c2 = calcularNotaFase(n.trim2?.n2, n.trim2?.ef);
                const def = c2 >= 6 ? c2 : (p.febrero || p.diciembre || "-");

                html += `
                    <tr>
                        <td style="text-align:left; font-weight:500;">${materia}</td>
                        <td>${n.trim1?.n1 || "-"}</td><td>${n.trim1?.n2 || "-"}</td><td>${n.trim1?.ef || "-"}</td>
                        <td style="font-weight:bold; background:#f8fafc;">${c1}</td>
                        <td>${n.trim2?.n1 || "-"}</td><td>${n.trim2?.n2 || "-"}</td><td>${n.trim2?.ef || "-"}</td>
                        <td style="font-weight:bold; background:#f8fafc;">${c2}</td>
                        <td>${p.diciembre || "-"}</td><td>${p.febrero || "-"}</td>
                        <td style="font-weight:bold; background:#f1f5f9;">${def}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
                <div style="margin-top:30px; font-size:10px; color:#555; text-align:right;">
                    Documento analítico de trayectorias escolares para auditoría pedagógica interna.
                </div>
            `;
        }

        html += `</div>`;
        return html;
    }

    function calcularNotaFase(n2, ef) {
        if (!n2) return "-";
        return n2 >= 6 ? n2 : (ef || "-");
    }

    function obtenerClaseColorNota(nota) {
        if (!nota || nota === "-") return "";
        const num = parseInt(nota, 10);
        if (isNaN(num)) return "";
        return num >= 6 ? "texto-aprobado-pdf" : "texto-desaprobado-pdf";
    }

    function cerrarModalPrevisualizacion() {
        if (modalContenedor) modalContenedor.style.display = "none";
        modalCuerpo.innerHTML = "";
    }

    // --- GUARDADO ASÍNCRONO SEGURO CON MAPA DE IMAGENES BINARIAS ---
    async function guardarLegajoDigital(e) {
        e.preventDefault();
        const idEdicion = document.getElementById('idOriginalEdicion').value;
        const dni = document.getElementById('dniAlumno').value.trim();
        const cicloActual = document.getElementById('filtroCicloLectivo').value;

        const fecha = new Date();
        const fechaFormateada = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;

        const alumnosRaw = localStorage.getItem('alumnosColegio');
        let alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];

        if (!idEdicion && alumnos.some(a => a.dni === dni)) {
            alert("Error: El número de DNI ya está registrado en la base de legajos.");
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
            fechaInscripcion: idEdicion ? (alumnos.find(a => a.dni === idEdicion)?.fechaInscripcion || fechaFormateada) : fechaFormateada,
            
            // Persistencia del mapa binario completo en el JSON estructurado
            documentosDigitales: { ...base64DocumentosTemporales }
        };

        if (idEdicion) {
            const idx = alumnos.findIndex(a => a.dni === idEdicion);
            if (idx !== -1) {
                // Al editar, si el usuario no cargó una nueva foto, retenemos el binario histórico existente
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
        alert(idEdicion ? "Legajo digitalizado actualizado con éxito." : "Estudiante matriculado con legajo activo.");
        salirModoEdicion();
        await procesarFiltrosYNomina();
    }

    // --- LECTURA Y CONVERSIÓN RETROALIMENTADA AL ENTRAR EN MODO EDICIÓN ---
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

        // Resetear y remapear la UI reactiva de documentos digitalizados
        const dMap = alumno.documentosDigitales || {};
        base64DocumentosTemporales = { ...dMap };

        const llavesRequisitos = ['dni_alumno', 'partida_nac', 'cert_primaria', 'bu
