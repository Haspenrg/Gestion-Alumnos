(async function() {
'use strict';

// Estándar de Conexión Anti-CORS Institucional (Crítico)
const b = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';

const { db } = await import('./firebase-config.js');
const { doc, getDoc, setDoc, collection, getDocs, deleteDoc, writeBatch, query, where } = await import(b + 'firebase-firestore.js');

// Elementos de la interfaz y selectores avanzados modificados
const formInscripcion = document.getElementById('formInscripcion');
const tbodyAlumnos = document.getElementById('tablaAlumnosBody');
const selectCursoFiltro = document.getElementById('filtroCursoEstructural');
const btnLoteInforme = document.getElementById('btnEmitirLoteInforme');
const btnLoteBoletin = document.getElementById('btnEmitirLoteBoletin');

// Elementos del Modal de Impresión
const modalContenedor = document.getElementById('modalImpresionContenedor');
const modalCuerpo = document.getElementById('modalImpresionCuerpo');
const btnCerrarModal = document.getElementById('btnCerrarModalImpresion');
// 🆕 AGREGAR ESTAS DOS LÍNEAS DEBAJO DE LAS REFERENCIAS DEL FORMULARIO:
const dniTutorAlumno = document.getElementById('dniTutorAlumno');
const emailTutor = document.getElementById('emailTutor');


// Variables de contexto de sesión globales
let usuarioLogueado = null;
let rolNormalizado = "";

// Objeto de persistencia digital
let base64DocumentosTemporales = {
    dni_alumno: null,
    partida_nac: null,
    cert_primaria: null,
    buena_salud: null,
    carnet_vacunas: null,
    dni_tutor: null,
    acta_ppi: null
};

// Inicialización asíncrona estructurada al cargar el DOM con retardo de seguridad
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(inicializarModuloInscripciones, 50));
} else {
    setTimeout(inicializarModuloInscripciones, 50);
}

async function inicializarModuloInscripciones() {
    const datosSesionRaw = localStorage.getItem('usuarioActivo');
    if (!datosSesionRaw) {
        window.location.href = "index.html";
        return;
    }
    usuarioLogueado = JSON.parse(datosSesionRaw);
    rolNormalizado = usuarioLogueado.rol ? usuarioLogueado.rol.toLowerCase().trim() : "";

    if (rolNormalizado === "preceptor") {
        const formulario = document.getElementById('contenedorFormularioAlta');
        const banner = document.getElementById('bannerPreceptor');
        if (formulario) formulario.style.display = "none";
        if (banner) banner.style.display = "block";
    }

    inicializarCiclosLectivosDinamicos();
    await inicializarSelectoresCursosDesdeCloud();
    await procesarFiltrosYNomina();
    inicializarManejadoresArchivosDigitales();
    inicializarManejadorReactivoPPI();
    inicializarManejadorReactivoPases();

    // Escuchador dinámico táctil para el cálculo automático de edad en vivo
    const inputFecha = document.getElementById('fechaNacimiento');
    if (inputFecha) {
        inputFecha.addEventListener('input', ejecutarCalculoEdadDinamico);
        inputFecha.addEventListener('change', ejecutarCalculoEdadDinamico);
    }

    if (formInscripcion) formInscripcion.addEventListener('submit', guardarLegajoDigital);
    document.getElementById('btnCancelarEdicion')?.addEventListener('click', salirModoEdicion);
    
    document.getElementById('filtroCicloLectivo').addEventListener('change', function() {
        localStorage.setItem('ultimoCicloTrabajado', this.value);
        procesarFiltrosYNomina();
    });
    
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

    // ==========================================
    // 💥 AUTOMATIZACIÓN DE CUIL (ALUMNO Y TUTOR)
    // ==========================================
   

    function dispararAutocompletadoCuil(inputDni, selectGenero, inputCuil) {
        if (!inputDni || !inputCuil) return;
        const dniVal = inputDni.value.replace(/[^0-9]/g, '').trim();
        const generoVal = selectGenero ? selectGenero.value : "Masculino";

        if (dniVal.length >= 7 && dniVal.length <= 8) {
            const cuilCalculado = calcularCuilAutomatico(dniVal, generoVal);
            if (cuilCalculado) {
                inputCuil.value = cuilCalculado;
            }
        } else {
            inputCuil.value = "";
        }
    }
    // Escuchadores reactivos vinculados correctamente
    // ANCLA_REPARACION_REACTIVA: Selectores directos para evitar caídas del hilo principal
const elDniAlu = document.getElementById('dniAlumno');
const elGenAlu = document.getElementById('generoAlumno');
const elCuiAlu = document.getElementById('cuilAlumno');

if (elDniAlu) elDniAlu.addEventListener('input', () => dispararAutocompletadoCuil(elDniAlu, elGenAlu, elCuiAlu));
if (elGenAlu) elGenAlu.addEventListener('change', () => dispararAutocompletadoCuil(elDniAlu, elGenAlu, elCuiAlu));
if (typeof inputDniTutor !== 'undefined' && inputDniTutor) inputDniTutor.addEventListener('input', () => dispararAutocompletadoCuil(inputDniTutor, typeof selectGeneroTutor !== 'undefined' ? selectGeneroTutor : null, typeof inputCuilTutor !== 'undefined' ? inputCuilTutor : null));
if (typeof selectGeneroTutor !== 'undefined' && selectGeneroTutor) selectGeneroTutor.addEventListener('change', () => dispararAutocompletadoCuil(inputDniTutor, selectGeneroTutor, typeof inputCuilTutor !== 'undefined' ? inputCuilTutor : null));


    btnLoteInforme?.addEventListener('click', () => emitirDocumentosEnLote('INFORME'));
    btnLoteBoletin?.addEventListener('click', () => emitirDocumentosEnLote('BOLETIN'));
    btnCerrarModal?.addEventListener('click', cerrarModalPrevisualizacion);
        document.getElementById('estadoAlumno')?.addEventListener('change', () => {
        evaluarEstadoMesaEntrada();
        evaluarVisibilidadPanelPases();
    });

    // Sincronización inicial automática en el arranque (Adentro de la función)
    evaluarVisibilidadPanelPases();
    if(typeof window.inicializarCargaMasivaSegura==='function')window.inicializarCargaMasivaSegura();

}


// --- CÁLCULO DE EDAD DINÁMICO ---
function ejecutarCalculoEdadDinamico() {
    const fechaNacValue = document.getElementById('fechaNacimiento').value;
    const inputEdad = document.getElementById('edadAlumno');
    if (!inputEdad) return;
    if (!fechaNacValue) {
        inputEdad.value = "";
        return;
    }
    const fechaNacimiento = new Date(fechaNacValue);
    const fechaActual = new Date();
    if (isNaN(fechaNacimiento.getTime())) {
        inputEdad.value = "";
        return;
    }
    let edadCalculada = fechaActual.getFullYear() - fechaNacimiento.getFullYear();
    const diferenciaMeses = fechaActual.getMonth() - fechaNacimiento.getMonth();
    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && fechaActual.getDate() < fechaNacimiento.getDate())) {
        edadCalculada--;
    }
    inputEdad.value = edadCalculada >= 0 ? `${edadCalculada} años` : "0 años";
}

// --- LÓGICA DE CICLOS LECTIVOS DINÁMICOS ---
function inicializarCiclosLectivosDinamicos() {
    const selectorCiclo = document.getElementById('filtroCicloLectivo');
    if (!selectorCiclo) return;

    const anioActual = 2026;
    selectorCiclo.innerHTML = "";

    for (let anio = anioActual; anio >= 2021; anio--) {
        const opcion = new Option(`Ciclo ${anio}`, `${anio}`);
        selectorCiclo.add(opcion);
    }

    const ultimoCicloGuardado = localStorage.getItem('ultimoCicloTrabajado');
    if (ultimoCicloGuardado && Array.from(selectorCiclo.options).some(opt => opt.value === ultimoCicloGuardado)) {
        selectorCiclo.value = ultimoCicloGuardado;
    } else {
        selectorCiclo.value = `${anioActual}`;
        localStorage.setItem('ultimoCicloTrabajado', `${anioActual}`);
    }
}

// --- MANEJADOR REACTIVO INTERACTIVO DE PASES ---
function inicializarManejadorReactivoPases() {
    const selectorEstado = document.getElementById('estadoAlumno');
    if (selectorEstado) {
        selectorEstado.addEventListener('change', evaluarVisibilidadPanelPases);
    }
}

function evaluarVisibilidadPanelPases() {
    const estado = document.getElementById('estadoAlumno').value;
    const panelPase = document.getElementById('panelCamposPase');
    if (!panelPase) return;

    if (estado === "Pase" || estado === "Baja") {
        panelPase.style.display = 'flex';
        document.getElementById('paseFecha').setAttribute('required', 'true');
        document.getElementById('paseInstitucion').setAttribute('required', 'true');
    } else {
        panelPase.style.display = 'none';
        document.getElementById('paseFecha').removeAttribute('required');
        document.getElementById('paseInstitucion').removeAttribute('required');
    }
}
function inicializarManejadorReactivoPPI() {
    const checkboxPPI = document.getElementById('chkHabilitarPPI');
    const panelPPI = document.getElementById('panelCamposPPI');
    const filaDocPPI = document.getElementById('filaDocumentoPPI');
    if (!checkboxPPI || !panelPPI || !filaDocPPI) return;

    checkboxPPI.addEventListener('change', function() {
        if (this.checked) {
            panelPPI.style.display = 'flex';
            filaDocPPI.style.display = 'grid';
            document.getElementById('ppiResolucion').setAttribute('required', 'true');
        } else {
            panelPPI.style.display = 'none';
            filaDocPPI.style.display = 'none';
            document.getElementById('ppiResolucion').removeAttribute('required');
            document.getElementById('ppiResolucion').value = "";
            document.getElementById('ppiMaestroApoyo').value = "";
            document.getElementById('ppiObservaciones').value = "";
            base64DocumentosTemporales.acta_ppi = null;
            actualizarFilaUIArchivo('acta_ppi', null);
        }
    });
}

function inicializarManejadoresArchivosDigitales() {
    const inputsArchivos = document.querySelectorAll('.input-archivo-oculto');
    inputsArchivos.forEach(input => {
        input.addEventListener('click', function(e) {
            const key = this.getAttribute('data-key');
            if (base64DocumentosTemporales[key]) {
                e.preventDefault();
                const confirmarEliminacion = confirm(`Atención:\nYa se encuentra cargado un documento.\n\n¿Desea eliminar el archivo y dejar el casillero vacío?`);
                if (confirmarEliminacion) {
                    base64DocumentosTemporales[key] = null;
                    actualizarFilaUIArchivo(key, null);
                }
            }
        });

        input.addEventListener('change', function(e) {
            const archivo = e.target.files;
            const key = this.getAttribute('data-key');
            if (!archivo) return;

            const limiteMaximoBytes = 1024 * 1024;
            if (archivo.size > limiteMaximoBytes) {
                alert(`El archivo supera el límite de 1MB establecido.`);
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
        alert("Autorice los pop-ups en el navegador para visualizar documentos.");
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

async function inicializarSelectoresCursosDesdeCloud() {
    const selectForm = document.getElementById('selectCursoAlumno');
    if (!selectForm || !selectCursoFiltro) return;
    selectForm.innerHTML = '<option value="" disabled selected>Seleccione el curso destino...</option>';
    selectCursoFiltro.innerHTML = '<option value="">Todos los Cursos</option>';

    try {
        const querySnapshot = await getDocs(collection(db, "cursos"));
        const listaCursos = [];
        querySnapshot.forEach(docSnap => {
            listaCursos.push(docSnap.data());
        });
        listaCursos.sort((a, b) => (a.ciclo || "").localeCompare(b.ciclo || ""));
        window.cachedCursosColegio = listaCursos;
        listaCursos.forEach(curso => {
            const texto = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
            selectForm.add(new Option(texto, curso.id));
            const numeroAnio = curso.ciclo ? curso.ciclo.charAt(0) : "1";
            selectCursoFiltro.add(new Option(`${numeroAnio} ° "${curso.division}"`, curso.id));
        });
    } catch (error) {
        console.error("Fallo al descargar la grilla de cursos:", error);
    }
}

function gestionarHabilitacionBotoneraLote() {
    const cursoSeleccionado = selectCursoFiltro.value;
    const deshabilitar = (cursoSeleccionado === "");
    if (btnLoteInforme) btnLoteInforme.disabled = deshabilitar;
    if (btnLoteBoletin) btnLoteBoletin.disabled = deshabilitar;
}

async function procesarFiltrosYNomina() {
    if (!tbodyAlumnos) return;
    tbodyAlumnos.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #1a73e8; font-weight: 500;">🔄 Descargando legajos digitalizados desde Cloud Firestore...</td></tr>`;
    let listaAlumnos = [];

    try {
        const querySnapshot = await getDocs(collection(db, "alumnos"));
        querySnapshot.forEach(docSnap => {
            listaAlumnos.push(docSnap.data());
        });
    } catch (error) {
        console.error("Error en sincronización remota de alumnos:", error);
        tbodyAlumnos.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#dc2626; padding:25px;">Fallo de conexión con el servidor.</td></tr>`;
        return;
    }

    const inputCicloDOM = document.getElementById('filtroCicloLectivo');
    const ciclo = (inputCicloDOM && inputCicloDOM.value) ? inputCicloDOM.value : (localStorage.getItem('ultimoCicloTrabajado') || "2026");
    
    const busqueda = document.getElementById('filtroBusquedaRapida').value.toLowerCase().trim();
    const cursoFiltro = selectCursoFiltro.value;
    const estadoFiltro = document.getElementById('filtroEstadoMatricula').value;
    const docFiltro = document.getElementById('filtroAuditoriaDocs').value;
    const ppiFiltro = document.getElementById('filtroPPI')?.value || "";

    // TOTAL MATRÍCULAS POR CICLO (Fijo y absoluto: No lo alteran los filtros secundarios)
    const totalMatriculasBrutasSinFiltro = listaAlumnos.filter(alumno => alumno.cicloLectivo === ciclo).length;

    if (rolNormalizado.includes("preceptor")) {
        try {
            const usersSnapshot = await getDocs(collection(db, "usuarios"));
            let usuarios = [];
            usersSnapshot.forEach(u => usuarios.push(u.data()));
            const preceptorReal = usuarios.find(u => u.dni === usuarioLogueado.dni);
            const cursosAsignados = preceptorReal ? (preceptorReal.cursosAsignados || []) : [];
            // Los pases y bajas siguen estando visibles para auditoría del preceptor si pertenecían a sus cursos
            listaAlumnos = listaAlumnos.filter(a => cursosAsignados.includes(a.cursoId));
        } catch (err) {
            console.error("Fallo relacional en matriz de preceptoría:", err);
        }
    }

    let alumnosFiltrados = listaAlumnos.filter(alumno => {
        if (alumno.cicloLectivo !== ciclo) return false;
        if (cursoFiltro && alumno.cursoId !== cursoFiltro) return false;
        if (estadoFiltro && alumno.estado !== estadoFiltro) return false;
        
        if (ppiFiltro && ppiFiltro !== "todos") {
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
            const mNombre = alumno.nombre ? alumno.nombre.toLowerCase().includes(busqueda) : false;
            const mDni = alumno.dni ? alumno.dni.includes(busqueda) : false;
            if (!mNombre && !mDni) return false;
        }
        return true;
    });

    const totalGeneralSpan = document.getElementById('contadorEstudiantes');
    if (totalGeneralSpan) {
        totalGeneralSpan.textContent = `Matrículas Visualizadas: ${alumnosFiltrados.length}`;
    }

    const totalAbsolutoSpan = document.getElementById('contadorTotalEstudiantes');
    if (totalAbsolutoSpan) {
        totalAbsolutoSpan.textContent = `Total Matrículas: ${totalMatriculasBrutasSinFiltro}`;
    }

    tbodyAlumnos.innerHTML = "";
    if (alumnosFiltrados.length === 0) {
        tbodyAlumnos.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:25px;">No se encontraron legajos con los criterios seleccionados.</td></tr>`;
        return;
    }

    window.currentAlumnosFiltradosCached = alumnosFiltrados;
    renderizarFilasEnTabla(alumnosFiltrados);
}
function renderizarFilasEnTabla(alumnos) {
    tbodyAlumnos.innerHTML = "";
    alumnos.forEach(alumno => {
        const tr = document.createElement('tr');
        tr.className = "fila-alumno";
        tr.style.borderBottom = "1px solid #e2e8f0";
        let celdaCurso = `<span class="badge-curso" style="background:#f1f5f9; color:#64748b;">Mesa Entrada</span>`;
        
        if (alumno.cursoId && window.cachedCursosColegio) {
            const cRef = window.cachedCursosColegio.find(c => c.id === alumno.cursoId);
            if (cRef) {
                const numeroAnio = cRef.ciclo ? cRef.ciclo.charAt(0) : "1";
                celdaCurso = `<span class="badge-curso">${numeroAnio} ° "${cRef.division}"</span>`;
            }
        }
        
        // Renderizado del estado mediante badges institucionales acumulativos
        if (alumno.estado === "Pase") {
            const tipoPase = alumno.paseHistorial?.tipo === "Saliente" ? "Saliente" : "Entrante";
            celdaCurso += ` <span class="badge-pase" style="background:#dbeafe; color:#1d4ed8;">Pase ${tipoPase}</span>`;
        }
        if (alumno.estado === "Baja") celdaCurso += ` <span class="badge-baja">Baja</span>`;

        const dMap = alumno.documentosDigitales || {};
        const cargados = ['dni_alumno', 'partida_nac', 'cert_primaria', 'buena_salud', 'carnet_vacunas', 'dni_tutor']
            .filter(k => dMap[k] !== null && dMap[k] !== undefined).length;
        const celdaAuditoria = cargados === 6
            ? `<span class="documentos-completos">✓ Completo (6/6)</span>`
            : `<span class="alerta-documentos">⚠ Incompleto (${cargados}/6)</span>`;

        const celdaInclusion = alumno.tienePPI
            ? `<span style="color:#e056fd; font-weight:bold; font-size:11px;">✨ Con PPI (${alumno.ppi?.resolucion || 'S/D'})</span>`
            : `<span style="color:#94a3b8; font-size:11px;">Estándar</span>`;

            // ====== PARCHE GENERALIZADO: Botones de visualización para todos los usuarios de Solo Lectura ======
    let accionesHTML = `<span style="color:#94a3b8; font-size:11px;">Lectura</span>`;
    
       // ====== PARCHE: Botón Datos exclusivo para Modo Consulta (Solo Lectura) ======
    const nombreEstudianteValido = alumno.nombreAlumno || alumno.nombre || 'Sin registrar';
    const direccionEstudianteValida = alumno.direccionAlumno || alumno.direccion || 'No especificada';

    if (rolNormalizado.includes("admin") || rolNormalizado.includes("direct") || rolNormalizado.includes("dir")) {
        // Modo Escritura (Administradores): Se remueve el botón Datos porque la info se ve a la izquierda
        accionesHTML = `
        <div style="display: flex; gap: 4px; justify-content: flex-start; align-items: center;">
            <button type="button" class="btn-accion-fila btn-fila-informe" data-dni="${alumno.dni}">Informe</button>
            <button type="button" class="btn-accion-fila btn-fila-boletin" data-dni="${alumno.dni}">Boletín</button>
            <button type="button" class="btn-accion-fila" data-dni="${alumno.dni}" style="background:#ef4444;">🗑</button>
        </div>
        `;
    } else {
        // Modo Consulta (Preceptores / Solo Lectura): Conserva el botón Datos con su mapeo flexible
        accionesHTML = `
        <div style="display: flex; gap: 4px; justify-content: flex-start; align-items: center;">
            <button type="button" class="btn-accion-fila btn-fila-ficha" 
                data-nombre="${nombreEstudianteValido}" 
                data-direccion="${direccionEstudianteValida}" 
                data-tel1="${alumno.telefono1 || 'No registrado'}" 
                data-tel2="${alumno.telefono2 || 'Ninguno'}" 
                data-tutor="${alumno.nombreTutor || 'No registrado'}" 
                data-tutordni="${alumno.dniTutorAlumno || 'Sin registrar'}" 
                data-dni="${alumno.dni}" style="background:#4b5563;" title="Ver Datos de Contacto">👁 Datos</button>
            <button type="button" class="btn-accion-fila btn-fila-informe" data-dni="${alumno.dni}">Informe</button>
            <button type="button" class="btn-accion-fila btn-fila-boletin" data-dni="${alumno.dni}">Boletín</button>
        </div>
        `;
    }

        tr.innerHTML = `
        <td style="padding: 10px 12px;"><strong>${alumno.nombre || ""}</strong><br><span style="color:#64748b; font-size:11px;">DNI: ${alumno.dni || ""}</span></td>
        <td style="padding: 10px 12px;">${celdaCurso}</td>
        <td style="padding: 10px 12px;">${celdaAuditoria}</td>
        <td style="padding: 10px 12px;">${celdaInclusion}</td>
        <td style="padding: 10px 12px; text-align: left;">${accionesHTML}</td>
        `;

        tr.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn-accion-fila')) return;
            if (rolNormalizado !== "preceptor") {
                cargarLegajoEnFormulario(alumno);
            }
        });
        tbodyAlumnos.appendChild(tr);
    });

    tbodyAlumnos.querySelectorAll('.btn-fila-informe').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            emitirDocumentoIndividual('INFORME', e.target.getAttribute('data-dni'));
        });
    });

    tbodyAlumnos.querySelectorAll('.btn-fila-boletin').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dniAlumno = e.target.getAttribute('data-dni');
            if (window.firebaseConfig) {
                localStorage.setItem('firebaseConfig', JSON.stringify(window.firebaseConfig));
            } else {
                const backupConfig = {
                    apiKey: localStorage.getItem('apiKey') || "",
                    authDomain: localStorage.getItem('authDomain') || "",
                    projectId: localStorage.getItem('projectId') || "",
                    storageBucket: localStorage.getItem('storageBucket') || "",
                    messagingSenderId: localStorage.getItem('messagingSenderId') || "",
                    appId: localStorage.getItem('appId') || ""
                };
                localStorage.setItem('firebaseConfig', JSON.stringify(backupConfig));
            }
            window.open(`boletin.html?dni=${dniAlumno}`, '_blank');
        });
    });

    tbodyAlumnos.querySelectorAll('button[style*="background:#ef4444"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            ejecutarBajaEstudianteFirestore(e.target.getAttribute('data-dni'));
        });
    });
}

function cargarLegajoEnFormulario(alumno) {
    document.getElementById('idOriginalEdicion').value = alumno.dni;
    document.getElementById('formTitulo').textContent = "Modificar Legajo Digital";
    document.getElementById('btnGuardar').textContent = "Guardar Cambios Digitales";
    document.getElementById('bannerEdicion').style.display = "block";
    document.getElementById('nombreAlumno').value = alumno.nombre || "";
    document.getElementById('dniAlumno').value = alumno.dni || "";
    document.getElementById('dniAlumno').disabled = true;
    document.getElementById('cuilAlumno').value = alumno.cuil || "";
    document.getElementById('fechaNacimiento').value = alumno.fechaNacimiento || "";
    document.getElementById('lugarNacimiento').value = alumno.lugarNacimiento || "";
    document.getElementById('nacionalidad').value = alumno.nacionalidad || "Argentina";
    document.getElementById('direccionAlumno').value = alumno.direccion || "";
    document.getElementById('telefono1').value = alumno.telefono1 || "";
    document.getElementById('telefono2').value = alumno.telefono2 || "";
    document.getElementById('nombreTutor').value = alumno.nombreTutor || "";
    if (dniTutorAlumno) dniTutorAlumno.value = alumno.dniTutor || "";
    if (emailTutor) emailTutor.value = alumno.emailTutor || "";
    if (document.getElementById('cuilTutor')) document.getElementById('cuilTutor').value = alumno.cuilTutor || "";

    document.getElementById('estadoAlumno').value = alumno.estado || "Regular";
    ejecutarCalculoEdadDinamico();

    const selectCurso = document.getElementById('selectCursoAlumno');
    if (selectCurso) {
        selectCurso.value = alumno.cursoId || "";
        evaluarEstadoMesaEntrada();
    }

    // Inyección adaptativa del panel relacional de pases/bajas
    evaluarVisibilidadPanelPases();
    if (alumno.estado === "Pase" || alumno.estado === "Baja") {
        document.getElementById('paseFecha').value = alumno.paseHistorial?.fecha || "";
        document.getElementById('paseTipoTramite').value = alumno.paseHistorial?.tipo || "Entrante";
        document.getElementById('paseInstitucion').value = alumno.paseHistorial?.colegio || "";
        document.getElementById('paseProvincia').value = alumno.paseHistorial?.provincia || "";
    }

    // Guardado en memoria volátil de la matriz histórica oculta para reingresos sucesivos
    window.currentPaseRegistroHistoricoCached = alumno.paseHistorial?.registroHistorico || [];

    const chkPPI = document.getElementById('chkHabilitarPPI');
    if (chkPPI) {
        chkPPI.checked = !!alumno.tienePPI;
        const panelPPI = document.getElementById('panelCamposPPI');
        const filaDocPPI = document.getElementById('filaDocumentoPPI');
        if (alumno.tienePPI) {
            panelPPI.style.display = 'flex';
            filaDocPPI.style.display = 'grid';
            document.getElementById('ppiResolucion').value = alumno.ppi?.resolucion || "";
            document.getElementById('ppiMaestroApoyo').value = alumno.ppi?.maestroApoyo || "";
            document.getElementById('ppiObservaciones').value = alumno.ppi?.observaciones || "";
        } else {
            panelPPI.style.display = 'none';
            filaDocPPI.style.display = 'none';
        }
    }

    base64DocumentosTemporales = {
        dni_alumno: alumno.documentosDigitales?.dni_alumno || null,
        partida_nac: alumno.documentosDigitales?.partida_nac || null,
        cert_primaria: alumno.documentosDigitales?.cert_primaria || null,
        buena_salud: alumno.documentosDigitales?.buena_salud || null,
        carnet_vacunas: alumno.documentosDigitales?.carnet_vacunas || null,
        dni_tutor: alumno.documentosDigitales?.dni_tutor || null,
        acta_ppi: alumno.documentosDigitales?.acta_ppi || null
    };

    Object.keys(base64DocumentosTemporales).forEach(key => {
        actualizarFilaUIArchivo(key, base64DocumentosTemporales[key], `archivo_${key}`);
    });
    document.getElementById('contenedorFormularioAlta').scrollIntoView({ behavior: 'smooth' });
}

function salirModoEdicion() {
    if (formInscripcion) formInscripcion.reset();
    document.getElementById('idOriginalEdicion').value = "";
    document.getElementById('dniAlumno').disabled = false;
    document.getElementById('formTitulo').textContent = "Matricular Estudiante";
    document.getElementById('btnGuardar').textContent = "Resguardar Legajo Digital";
    document.getElementById('bannerEdicion').style.display = "none";
    document.getElementById('edadAlumno').value = "";
    if (dniTutorAlumno) dniTutorAlumno.value = "";
    if (emailTutor) emailTutor.value = "";
    if (document.getElementById('cuilTutor')) document.getElementById('cuilTutor').value = "";
    const panelPPI = document.getElementById('panelCamposPPI');
    const filaDocPPI = document.getElementById('filaDocumentoPPI');
    if (panelPPI) panelPPI.style.display = 'none';
    if (filaDocPPI) filaDocPPI.style.display = 'none';

    const panelPase = document.getElementById('panelCamposPase');
    if (panelPase) panelPase.style.display = 'none';

    window.currentPaseRegistroHistoricoCached = [];

    base64DocumentosTemporales = { dni_alumno: null, partida_nac: null, cert_primaria: null, buena_salud: null, carnet_vacunas: null, dni_tutor: null, acta_ppi: null };
    Object.keys(base64DocumentosTemporales).forEach(key => actualizarFilaUIArchivo(key, null));
    evaluarEstadoMesaEntrada();
}

async function guardarLegajoDigital(e) {
    e.preventDefault();
    if (rolNormalizado === "preceptor") return;

    const dni = document.getElementById('dniAlumno').value.trim();
    const idEdicion = document.getElementById('idOriginalEdicion').value;
    const cicloLectivo = document.getElementById('filtroCicloLectivo').value;
    const estadoActual = document.getElementById('estadoAlumno').value;

    let matrizHistoricaPases = window.currentPaseRegistroHistoricoCached || [];

    // SI EL ALUMNO ESTABA EN EDICIÓN Y ANTES SE HABÍA IDO DE PASE, PERO AHORA VUELVE A ESTAR REGULAR
    if (idEdicion) {
        try {
            const snapExistente = await getDoc(doc(db, "alumnos", dni));
            if (snapExistente.exists()) {
                const viejoAlumnoData = snapExistente.data();
                // Si el estado anterior era Pase o Baja, archivamos ese movimiento en el historial permanente
                if ((viejoAlumnoData.estado === "Pase" || viejoAlumnoData.estado === "Baja") && estadoActual === "Regular") {
                    matrizHistoricaPases.push({
                        fecha: viejoAlumnoData.paseHistorial?.fecha || "S/D",
                        tipo: viejoAlumnoData.paseHistorial?.tipo || "Saliente",
                        colegio: viejoAlumnoData.paseHistorial?.colegio || "S/D",
                        provincia: viejoAlumnoData.paseHistorial?.provincia || "S/D",
                        fechaReingresoEfectivo: new Date().toISOString().split('T')[0]
                    });
                }
            }
        } catch (err) {
            console.warn("No se pudo auditar el estado anterior para reingreso:", err);
        }
    } else {
        const docSnap = await getDoc(doc(db, "alumnos", dni));
        if (docSnap.exists()) {
            alert(`El DNI "${dni}" ya pertenece a un estudiante registrado.`);
            return;
        }
    }

    const nuevoLegajo = {
        dni,
        cicloLectivo,
        nombre: document.getElementById('nombreAlumno').value.trim(),
        cuil: document.getElementById('cuilAlumno').value.trim(),
        fechaNacimiento: document.getElementById('fechaNacimiento').value,
        lugarNacimiento: document.getElementById('lugarNacimiento').value.trim(),
        nacionalidad: document.getElementById('nacionalidad').value.trim(),
        direccion: document.getElementById('direccionAlumno').value.trim(),
        telefono1: document.getElementById('telefono1').value.trim(),
        telefono2: document.getElementById('telefono2').value.trim(),
        nombreTutor: document.getElementById('nombreTutor').value.trim(),
        cuilTutor: document.getElementById('cuilTutor') ? document.getElementById('cuilTutor').value.trim() : "",
        dniTutor: document.getElementById('dniTutorAlumno') ? document.getElementById('dniTutorAlumno').value.trim() : "",
        emailTutor: document.getElementById('emailTutor') ? document.getElementById('emailTutor').value.trim() : "",    
        estado: estadoActual,
        cursoId: estadoActual === "Entrante" ? "" : document.getElementById('selectCursoAlumno').value,
        tienePPI: document.getElementById('chkHabilitarPPI').checked,
        ppi: {
            resolucion: document.getElementById('ppiResolucion').value.trim(),
            maestroApoyo: document.getElementById('ppiMaestroApoyo').value.trim(),
            observaciones: document.getElementById('ppiObservaciones').value.trim()
        },
        paseHistorial: {
            fecha: (estadoActual === "Pase" || estadoActual === "Baja") ? document.getElementById('paseFecha').value : "",
            tipo: (estadoActual === "Pase" || estadoActual === "Baja") ? document.getElementById('paseTipoTramite').value : "",
            colegio: (estadoActual === "Pase" || estadoActual === "Baja") ? document.getElementById('paseInstitucion').value.trim() : "",
            provincia: (estadoActual === "Pase" || estadoActual === "Baja") ? document.getElementById('paseProvincia').value.trim() : "",
            registroHistorico: matrizHistoricaPases
        },
        documentosDigitales: { ...base64DocumentosTemporales }
    };

    try {
        await setDoc(doc(db, "alumnos", dni), nuevoLegajo);
        localStorage.setItem('ultimoCicloTrabajado', cicloLectivo);

        alert(idEdicion ? "Legajo digital modificado con éxito." : "Estudiante matriculado con éxito.");
        salirModoEdicion();
        await procesarFiltrosYNomina();
    } catch (error) {
        console.error("Error al persistir legajo:", error);
        alert("Error crítico: No se completó el resguardo remoto.");
    }
}

async function ejecutarBajaEstudianteFirestore(dni) {
    if (!confirm(`¿Está seguro de eliminar por completo el legajo del DNI ${dni}?`)) return;
    try {
        await deleteDoc(doc(db, "alumnos", dni));
        alert("Legajo digital purgado correctamente.");
        if (document.getElementById('idOriginalEdicion').value === dni) salirModoEdicion();
        await procesarFiltrosYNomina();
    } catch (error) {
        alert("No se pudo completar la baja.");
    }
}

async function emitirDocumentoIndividual(tipo, dni) {
    try {
        const snapAlumno = await getDoc(doc(db, "alumnos", dni));
        if (!snapAlumno.exists()) return;
        const alumno = snapAlumno.data();
        let cursoTexto = "Mesa de Entrada";
        let materiasEstructura = [];

        if (alumno.cursoId) {
            const snapCurso = await getDoc(doc(db, "cursos", alumno.cursoId));
            if (snapCurso.exists()) {
                const cData = snapCurso.data();
                cursoTexto = `${cData.ciclo} - "${cData.division}" (${cData.turno})`;
                materiasEstructura = cData.materias || [];
            }
        }

        let calificacionesMapeadas = {};
        try {
            const snapCalificaciones = await getDocs(collection(db, "calificaciones"));
            snapCalificaciones.forEach(cDoc => {
                const cData = cDoc.data();
                if (cData.alumnoDni === dni) {
                    calificacionesMapeadas[cData.materia] = cData.cuatrimestres || {};
                }
            });
        } catch (err) {
            console.warn("No se pudo sincronizar la matriz de calificaciones.");
        }

        let inasistenciasTotales = 0;
        try {
            const snapAsistencias = await getDocs(collection(db, "asistencias"));
            snapAsistencias.forEach(aDoc => {
                const aData = aDoc.data();
                if (aData.alumnoDni === dni && aData.valor) {
                    inasistenciasTotales += parseFloat(aData.valor);
                }
            });
        } catch (err) {
            console.warn("No se pudo sincronizar del total de inasistencias.");
        }

        modalCuerpo.innerHTML = tipo === 'INFORME'
            ? construirMediaHojaInformePedagogico(alumno, cursoTexto, materiasEstructura, calificacionesMapeadas, inasistenciasTotales)
            : construirHojaA4BoletinOficial(alumno, cursoTexto, materiasEstructura, calificacionesMapeadas);
        modalContenedor.style.display = "flex";
    } catch (error) {
        console.error("Fallo de composición en reportes:", error);
    }
}

async function emitirDocumentosEnLote(tipo) {
    const cursoId = selectCursoFiltro.value;
    const cicloLectivo = document.getElementById('filtroCicloLectivo').value;
    if (!cursoId) return;

    if (tipo === 'BOLETIN') {
        if (window.firebaseConfig) {
            localStorage.setItem('firebaseConfig', JSON.stringify(window.firebaseConfig));
        } else {
            const backupConfig = {
                apiKey: localStorage.getItem('apiKey') || "",
                authDomain: localStorage.getItem('authDomain') || "",
                projectId: localStorage.getItem('projectId') || "",
                storageBucket: localStorage.getItem('storageBucket') || "",
                messagingSenderId: localStorage.getItem('messagingSenderId') || "",
                appId: localStorage.getItem('appId') || ""
            };
            localStorage.setItem('firebaseConfig', JSON.stringify(backupConfig));
        }
        window.open(`boletin.html?cursoId=${cursoId}&ciclo=${cicloLectivo}`, '_blank');
        return;
    }

    if (!window.currentAlumnosFiltradosCached) return;
    let htmlAcumulado = "";
    const cRef = window.cachedCursosColegio.find(c => c.id === cursoId);
    const cursoTexto = cRef ? `${cRef.ciclo} - "${cRef.division}" (${cRef.turno})` : "";
    const materiasEstructura = cRef ? (cRef.materias || []) : [];

    let todasCalificaciones = [];
    try {
        const snapCalificaciones = await getDocs(collection(db, "calificaciones"));
        snapCalificaciones.forEach(cDoc => todasCalificaciones.push(cDoc.data()));
    } catch (err) {
        console.warn("Fallo masivo de calificaciones.");
    }

    let todasAsistencias = [];
    try {
        const snapAsistencias = await getDocs(collection(db, "asistencias"));
        snapAsistencias.forEach(aDoc => todasAsistencias.push(aDoc.data()));
    } catch (err) {
        console.warn("Fallo masivo de asistencias.");
    }

    window.currentAlumnosFiltradosCached.forEach(alumno => {
        let calificacionesMapeadas = {};
        todasCalificaciones.forEach(cData => {
            if (cData.alumnoDni === alumno.dni) {
                calificacionesMapeadas[cData.materia] = cData.cuatrimestres || {};
            }
        });
        let inasistenciasTotales = 0;
        todasAsistencias.forEach(aData => {
            if (aData.alumnoDni === alumno.dni && aData.valor) {
                inasistenciasTotales += parseFloat(aData.valor);
            }
        });
        htmlAcumulado += construirMediaHojaInformePedagogico(alumno, cursoTexto, materiasEstructura, calificacionesMapeadas, inasistenciasTotales);
    });
    modalCuerpo.innerHTML = htmlAcumulado;
    modalContenedor.style.display = "flex";
}

function construirMediaHojaInformePedagogico(alumno, cursoTexto, materias, calificaciones, inasistencias) {
    let filasHTML = "";
    if (materias.length === 0) {
        filasHTML = `<tr><td colspan="10" style="padding:10px; color:#666;">Sin asignaturas asignadas.</td></tr>`;
    } else {
        materias.forEach(materia => {
            const c = calificaciones[materia] || {};
            const inf1_1 = c.c1_inf1 || "0";
            const inf1_2 = c.c1_inf2 || "0";
            const forta1 = c.c1_forta || "0";
            const notaC1 = c.c1_nota || "0";
            const inf2_1 = c.c2_inf1 || "0";
            const inf2_2 = c.c2_inf2 || "0";
            const forta2 = c.c2_forta || "0";
            const notaC2 = c.c2_nota || "0";
            const finalNota = c.nota_final || "0";

            filasHTML += `
            <tr>
                <td style="text-align:left; font-weight:bold; font-size:9px; padding:3px;">${materia}</td>
                <td>${inf1_1}</td>
                <td>${inf1_2}</td>
                <td>${forta1}</td>
                <td style="background:#f1f5f9; font-weight:bold;">${notaC1}</td>
                <td>${inf2_1}</td>
                <td>${inf2_2}</td>
                <td>${forta2}</td>
                <td style="background:#f1f5f9; font-weight:bold;">${notaC2}</td>
                <td style="background:#e2e8f0; font-weight:bold; font-size:11px;">${finalNota}</td>
            </tr>
            `;
        });
    }

    return `
    <div class="contenedor-media-hoja-pdf">
        <div style="text-align:center; margin-bottom:5px; border-bottom:1px solid #000; padding-bottom:2px;">
            <h2 style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">INFORME PEDAGÓGICO COLEGIO HASPEN</h2>
        </div>
        <table style="width:100%; font-size:10px; margin-bottom:5px; text-align:left; line-height:1.2;">
            <tr>
                <td style="font-weight:bold; width:12%;">Estudiante:</td>
                <td style="border-bottom:1px solid #000; width:38%; font-weight:bold;">${alumno.nombre || ''}</td>
                <td style="font-weight:bold; width:8%;">D.N.I.:</td>
                <td style="border-bottom:1px solid #000; width:17%;">${alumno.dni || ''}</td>
                <td style="font-weight:bold; width:8%;">Ciclo:</td>
                <td style="border-bottom:1px solid #000; width:17%;">${alumno.cicloLectivo || ''}</td>
            </tr>
            <tr>
                <td style="font-weight:bold;">CURSO:</td>
                <td style="border-bottom:1px solid #000;">${cursoTexto}</td>
                <td style="font-weight:bold;">TURNO:</td>
                <td style="border-bottom:1px solid #000;" colspan="3">${alumno.cursoId ? window.cachedCursosColegio.find(c => c.id === alumno.cursoId)?.turno.toUpperCase() : 'S/D'}</td>
            </tr>
        </table>
        <table class="tabla-hoja-documento">
            <thead>
                <tr>
                    <th rowspan="2" style="width:28%; text-align:left;">ESPACIO CURRICULAR</th>
                    <th colspan="4" style="background:#e0f2fe !important;">1° CUATRIMESTRE</th>
                    <th colspan="4" style="background:#fef3c7 !important;">2° CUATRIMESTRE</th>
                    <th rowspan="2" style="width:8%; background:#cbd5e1 !important;">FINAL</th>
                </tr>
                <tr>
                    <th style="width:7%;">1° INF</th>
                    <th style="width:7%;">2° INF</th>
                    <th style="width:7%;">FORTA.</th>
                    <th style="width:8%; background:#bae6fd !important;">1° CUATRI</th>
                    <th style="width:7%;">1° INF</th>
                    <th style="width:7%;">2° INF</th>
                    <th style="width:7%;">FORTA.</th>
                    <th style="width:8%; background:#fcd34d !important;">2° CUATRI</th>
                </tr>
            </thead>
            <tbody>
                ${filasHTML}
            </tbody>
        </table>
        <div style="margin-top:6px; display:flex; justify-content:space-between; align-items:center; font-size:10px;">
            <div style="border:1px solid #000; padding:4px 10px; font-weight:bold; background:#f8fafc;">
                INASISTENCIAS TOTALES REGISTRADAS: <span style="font-size:11px; color:#ef4444;">${inasistencias}</span>
            </div>
            <div style="display:flex; gap:30px; font-size:8px; margin-top:15px;">
                <div style="width:110px; border-top:1px solid #000; text-align:center; padding-top:2px;">Firma del Preceptor/a</div>
                <div style="width:110px; border-top:1px solid #000; text-align:center; padding-top:2px;">Sello del Establecimiento</div>
            </div>
        </div>
    </div>
    `;
}

function construirHojaA4BoletinOficial(alumno, cursoTexto, materias, calificaciones) {
    return ``;
}

function cerrarModalPrevisualizacion() {
    modalContenedor.style.display = "none";
    modalCuerpo.innerHTML = "";
}
document.getElementById('modalImpresionContenedor')?.addEventListener('click', function(e) {
    if (e.target.id === 'btnCerrarModalImpresion' || e.target.closest('#btnCerrarModalImpresion')) {
        modalContenedor.style.display = "none";
        modalCuerpo.innerHTML = "";
    }
});

// MOTOR MATEMÁTICO ADAPTATIVO PARA CÁLCULO DE CUIL (ALGORITMO ANSES)
function calcularCuilAutomatico(dniStr, generoStr) {
    const dniLimpio = dniStr.replace(/[^0-9]/g, '');
    if (dniLimpio.length < 7 || dniLimpio.length > 8) return "";

    // Completar con ceros a la izquierda si el DNI tiene 7 dígitos
    const dniPad = dniLimpio.padStart(8, '0');
    
    // Determinar prefijo según género (Masculino: 20, Femenino: 27)
    let prefijo = "20"; 
    if (generoStr && generoStr.toLowerCase() === "femenino") {
        prefijo = "27";
    }

    const baseXY = prefijo + dniPad;
    const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
    let suma = 0;
    for (let i = 0; i < 10; i++) {
        suma += parseInt(baseXY[i]) * factores[i];
    }

    let resto = suma % 11;
    let verificador = 0;

    if (resto === 1) {
        // Corrección reglamentaria de ANSES para evitar verificador de dos dígitos
        if (prefijo === "20") prefijo = "23";
        else if (prefijo === "27") prefijo = "23";
        
        const nuevaBase = prefijo + dniPad;
        let nuevaSuma = 0;
        for (let i = 0; i < 10; i++) {
            nuevaSuma += parseInt(nuevaBase[i]) * factores[i];
        }
        let nuevoResto = nuevaSuma % 11;
        verificador = nuevoResto === 0 ? 0 : 11 - nuevoResto;
    } else if (resto > 1) {
        verificador = 11 - resto;
    }

    return prefijo + dniPad + verificador;
}

    // ====== PARCHE: Interceptor reactivo basado en Atributos del DOM ======
    document.getElementById('tablaAlumnosBody')?.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-fila-ficha');
        if (!btn) return;
        
        // Extraemos las propiedades dinámicas inyectadas desde el HTML
        const nombre = btn.getAttribute('data-nombre');
        const dni = btn.getAttribute('data-dni');
        const direccion = btn.getAttribute('data-direccion');
        const tel1 = btn.getAttribute('data-tel1');
        const tel2 = btn.getAttribute('data-tel2');
        const tutor = btn.getAttribute('data-tutor');
        const tutordni = btn.getAttribute('data-tutordni');
        
        const contenedorModal = document.getElementById('modalImpresionContenedor');
        const cuerpoModal = document.getElementById('modalImpresionCuerpo');
        
        if (contenedorModal && cuerpoModal) {
            cuerpoModal.innerHTML = `
            <div style="padding: 20px; background: white; border-radius: 6px; border: 1px solid #cbd5e1; font-family: inherit; text-align: left; max-width: 550px; margin: 30px auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-top: 0; font-size: 18px;">Ficha de Contacto Institucional</h2>
                <p style="font-size: 15px; margin: 12px 0;"><strong>Estudiante:</strong> ${nombre}</p>
                <p style="font-size: 13px; margin: 8px 0; color: #475569;"><strong>DNI Alumno:</strong> ${dni}</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
                <div style="display: flex; flex-direction: column; gap: 10px; color: #334155; font-size: 14px;">
                    <div><strong>📍 Dirección de Residencia:</strong> ${direccion}</div>
                    <div><strong>📞 Teléfono de Contacto 1:</strong> <span style="color: #2563eb; font-weight: bold;">${tel1}</span></div>
                    <div><strong>📱 Teléfono Alternativo 2:</strong> ${tel2}</div>
                    <div style="background: #f8fafc; padding: 12px; border-left: 4px solid #10b981; margin-top: 5px; border-radius: 0 4px 4px 0;">
                        <strong style="color: #065f46;">👤 Adulto Responsable / Tutor:</strong> ${tutor}<br>
                        <span style="font-size: 12px; color: #64748b;">DNI Tutor: ${tutordni}</span>
                    </div>
                </div>
            </div>
            `;
            contenedorModal.style.display = "flex";
        }
    });

})();
