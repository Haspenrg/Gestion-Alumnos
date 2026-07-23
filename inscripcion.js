(async function() {
'use strict';
// MOTOR DE MENSAJERÍA INSTITUCIONAL COLEGIO HASPEN (REEMPLAZO DE ALERT/CONFIRM)
window.haspenAlert = function(mensaje, tipo = "info") {
    const contenedor = document.getElementById('haspen-toast-container');
    if (!contenedor) return;
    const toast = document.createElement('div');
    let bg = "#1e293b", icono = "ℹ️";
    if (tipo === "exito") { bg = "#16a34a"; icono = "✅"; }
    else if (tipo === "error") { bg = "#dc2626"; icono = "❌"; }
    else if (tipo === "alerta") { bg = "#d97706"; icono = "⚠️"; }
    
    toast.style.cssText = `background: ${bg}; color: white; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); opacity: 0; transform: translateY(20px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`;
    toast.innerHTML = `<span>${icono}</span><span style="flex: 1;">${mensaje}</span>`;
    contenedor.appendChild(toast);
    
    setTimeout(() => { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; }, 10);
    setTimeout(() => {
        toast.style.opacity = "0"; toast.style.transform = "translateY(-20px)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

window.haspenConfirm = function(mensaje, titulo = "Confirmar Acción", icono = "⚠️") {
    return new Promise((resolve) => {
        const modal = document.getElementById('haspen-modal-confirm');
        const txtTitulo = document.getElementById('haspen-confirm-titulo');
        const txtMensaje = document.getElementById('haspen-confirm-mensaje');
        const icoElement = document.getElementById('haspen-confirm-icono');
        const btnAceptar = document.getElementById('haspen-confirm-btn-aceptar');
        const btnCancelar = document.getElementById('haspen-confirm-btn-cancelar');
        
        if (!modal || !txtMensaje) return resolve(false);
        
        txtTitulo.textContent = titulo;
        txtMensaje.textContent = mensaje;
        icoElement.textContent = icono;
        modal.style.display = "flex";
        
        const cerrar = (resultado) => {
            modal.style.display = "none";
            btnAceptar.onclick = null;
            btnCancelar.onclick = null;
            resolve(resultado);
        };
        
        btnAceptar.onclick = () => cerrar(true);
        btnCancelar.onclick = () => cerrar(false);
    });
};


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
    // Escudo de capacidades dinámicas extraído directamente de la sesión activa
const capacidadesSesion = usuarioLogueado.permisosDelRol || {};
window.permisoMatricula = capacidadesSesion.legajoDigital ? capacidadesSesion.legajoDigital.toLowerCase().trim() : "ninguno";
// Salvaguarda de infraestructura para cuentas de administración nativa
if (rolNormalizado.includes("admin") || rolNormalizado.includes("administrador")) {
    window.permisoMatricula = "escritura";
}
// Gobernación atómica del modo de operación de la pantalla
window.esSoloLectura = (window.permisoMatricula !== "escritura");
        if ( window. esSoloLectura === true) {
        const formulario = document. getElementById('contenedorFormularioAlta');
        const banner = document. getElementById('bannerPreceptor');
        if ( formulario) formulario. style. display = "none";
        if ( banner) banner. style. display = "block";
        document.body.classList.add('modo-lectura-activo');
    }
    inicializarCiclosLectivosDinamicos();
    await inicializarSelectoresCursosDesdeCloud();
    // FILTRO REAL DE PRECEPTORES: Consulta a Firebase usando el DNI de la sesión activa
    const sesionLocal = localStorage.getItem('usuarioActivo');
    if (window.esSoloLectura === true && selectCursoFiltro && window.cachedCursosColegio && sesionLocal) {
        const usuarioReal = JSON.parse(sesionLocal);        
        // Vamos a la base de datos a buscar el documento de este usuario usando su DNI
        if (usuarioReal.dni) {
            getDoc(doc(db, "usuarios", usuarioReal.dni)).then((userDocSnap) => {
                if (userDocSnap.exists()) {
                    const datosNube = userDocSnap.data();
                    // Extraemos los cursosAsignados directos de la base de datos (Ej: ["1-A-M", "1-B-M"])
                    const permitidos = datosNube.cursosAsignados || [];
                    
                    if (permitidos.length > 0) {
                        const cursosFiltrados = window.cachedCursosColegio.filter(curso => {
                            const nombreFormateado = `${curso.ciclo} "${curso.division}"`;
                            return permitidos.includes(curso.id) || permitidos.includes(nombreFormateado);
                        });
                        selectCursoFiltro.innerHTML = '<option value="">Todos los Cursos</option>';
                        cursosFiltrados.forEach(curso => {
                            const numeroAnio = curso.ciclo ? curso.ciclo.charAt(0) : "1";
                            selectCursoFiltro.add(new Option(`${numeroAnio}° "${curso.division}"`, curso.id));
                        });                       
                        // Forzamos a la tabla a refrescarse con el primer curso permitido de la lista
                        if (cursosFiltrados.length > 0 && typeof procesarFiltrosYNomina === 'function') {
                            selectCursoFiltro.value = cursosFiltrados[0].id;
                            procesarFiltrosYNomina();
                        }
                    }
                }
            }).catch(err => console.error("Error al recuperar cursos del preceptor:", err));
        }
    }
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

   /* ==========================================================================
   ANCLA_REPARACION_CONSOLA: Parche de Seguridad de Carga Masiva
   ========================================================================== */
btnLoteInforme?.addEventListener('click', () => emitirDocumentosEnLote('INFORME'));
btnLoteBoletin?.addEventListener('click', () => emitirDocumentosEnLote('BOLETIN'));
document.getElementById('estadoAlumno')?.addEventListener('change', () => {
    evaluarEstadoMesaEntrada();
    evaluarVisibilidadPanelPases();
});
evaluarVisibilidadPanelPases();
// --- CONTROL COERCITIVO EXCLUSIVO DE CARGA MASIVA PARA EL ADMINISTRADOR ---
const divCargaMasiva = document.getElementById('contenedorCargaMasiva');
if (divCargaMasiva) {
    const rolUsuarioActivo = usuarioLogueado && usuarioLogueado.rol ? usuarioLogueado.rol.toLowerCase().trim() : "";   
    if (rolUsuarioActivo === "administrador") {
        divCargaMasiva.style.display = "flex";
        // Ejecución segura del Motor de Carga Masiva solo para el Administrador
        if (typeof window.inicializarCargaMasivaSegura === 'function') {
            window.inicializarCargaMasivaSegura();
        }
    } else {
        // Se oculta y bloquea de raíz para cualquier otro operador (Preceptores, Directivos, etc.)
        divCargaMasiva.style.display = "none";
    }
}

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
// --- MANEJADOR DE AUDITORÍA DIGITAL CON COMPRESIÓN DE ALTA FIDELIDAD ---
function inicializarManejadoresArchivosDigitales() {
    const inputsArchivos = document.querySelectorAll('.input-archivo-oculto');   
    // Función interna para comprimir imágenes mediante Canvas manteniendo alta nitidez
    function procesarYComprimirImagen(base64Original) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Original;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');                
                const MAX_WIDTH = 1600; // Resolución optimizada para lectura de textos finos
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                // Exporta como JPEG al 75% de fidelidad (equilibrio perfecto nitidez/peso)
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = function() {
                resolve(base64Original); // PDFs o archivos no gráficos pasan sin alteración
            };
        });
    }
    inputsArchivos.forEach(input => {
        // ====== PARCHE: Reemplazo confirm() nativo por haspenConfirm asíncrono ======
  input.addEventListener('click', async function(e) {
    const key = this.getAttribute('data-key');
    if (base64DocumentosTemporales[key]) {
      e.preventDefault();
      const confirmarEliminacion = await window.haspenConfirm(
        "Ya se encuentra cargado un documento. ¿Desea eliminar el archivo y dejar el casillero vacío?",
        "Atención",
        "⚠️"
      );
      if (confirmarEliminacion) {
        base64DocumentosTemporales[key] = null;
        actualizarFilaUIArchivo(key, null);
      }
    }
  });
// =========================================================================

        input.addEventListener('change', function(e) {
            const archivo = e.target.files[0]; // Captura segura del archivo individual
            const key = this.getAttribute('data-key');
            if (!archivo) return;

            const lectorBinario = new FileReader();
            lectorBinario.onload = async function(evt) {
                let stringBase64Final = evt.target.result;
                const umbralSeguroBytes = 300 * 1024; // 300 KB
                // Intercepta solo si supera el umbral y es formato gráfico
                if (archivo.size > umbralSeguroBytes && archivo.type.startsWith('image/')) {
                    console.log(`[Compresor HD] Optimizando imagen pesada de ${(archivo.size / 1024).toFixed(1)} KB.`);
                    stringBase64Final = await procesarYComprimirImagen(stringBase64Final);
                }
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
// ====== PARCHE: Reemplazo alert() nativo por haspenAlert en pop-ups ======
function abrirDocumentoPestanaNueva(base64Data, nombreArchivo) {
  const ventanaEmergente = window.open();
  if (!ventanaEmergente) {
    window.haspenAlert("Autorice los pop-ups en el navegador para visualizar documentos.", "alerta");
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
// =========================================================================

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
        querySnapshot.forEach((docSnap) => {
            // Guardamos el ID del documento de Firebase junto con sus datos
            listaCursos.push({ id: docSnap.id, ...docSnap.data() });
        });
        listaCursos.sort((a, b) => (a.ciclo || "").localeCompare(b.ciclo || ""));
        window.cachedCursosColegio = listaCursos;
        listaCursos.forEach(curso => {
            const texto = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
            selectForm.add(new Option(texto, curso.id));
            const numeroAnio = curso.ciclo ? curso.ciclo.charAt(0) : "1";
            selectCursoFiltro.add(new Option(`${numeroAnio}° "${curso.division}"`, curso.id));
        });
    } catch (error) {
        console.error("Fallo al descargar la grilla de cursos:", error);
    }
}
function gestionarHabilitacionBotoneraLote() {
    const cursoSeleccionado = selectCursoFiltro.value;
    const deshabilitar = (cursoSeleccionado === "" || cursoSeleccionado === "todos");
    if (btnLoteInforme) btnLoteInforme.disabled = deshabilitar;
    if (btnLoteBoletin) btnLoteBoletin.disabled = deshabilitar;
}
async function procesarFiltrosYNomina() {
    window.paginaActualAlumnos = 1; // Resetea a la primera página ante cualquier cambio de filtro
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

    // REPARACIÓN: Restricción por territorio explícito (Aplica a preceptores comunes)
    // =========================================================================
    if (window.esSoloLectura === true) {
        // Obtenemos los cursos asignados que ya vienen en el usuario logueado de la sesión
        const cursosPermitidos = usuarioLogueado.cursosAsignados || [];
        
        // REGLA SENIOR: Si tiene cursos asignados en su ficha, se restringe (Preceptor).
        // Si el arreglo está vacío, es un rango superior y ve toda la escuela (Jefe / Directivo).
        if (cursosPermitidos.length > 0) {
            listaAlumnos = listaAlumnos.filter(al => cursosPermitidos.includes(al.cursoId));
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
    window.cachedAlumnosGlobal = listaAlumnos;
    window.currentAlumnosFiltradosCached = alumnosFiltrados;
    renderizarFilasEnTabla(alumnosFiltrados);
}
/* ==========================================================================
   ANCLA_PAGINACION: Segmentación estricta de 25 registros por página
   ========================================================================== */
function renderizarFilasEnTabla(alumnos) {
    tbodyAlumnos.innerHTML = "";
    if (typeof window.paginaActualAlumnos === 'undefined') {
        window.paginaActualAlumnos = 1;
    }
    if (typeof window.registrosPorPaginaAlumnos === 'undefined') {
        window.registrosPorPaginaAlumnos = 25;
    }
    window.totalAlumnosFiltradosPaginacion = alumnos.length;
    const indiceInicio = (window.paginaActualAlumnos - 1) * window.registrosPorPaginaAlumnos;
    const indiceFin = indiceInicio + window.registrosPorPaginaAlumnos;
    const alumnosPaginados = alumnos.slice(indiceInicio, indiceFin);
    alumnosPaginados.forEach(alumno => {
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
                const celdaInclusion = (alumno.trayectoriaPPI === true || alumno.tienePPI === true)
            ? `<span style="color:#e056fd; font-weight:bold; font-size:11px;">🗲 Con PPI</span>`
            : (alumno.trayectoriaFlexible === true
                ? `<span style="color:#0ea5e9; font-weight:bold; font-size:11px;">🗲 Flexible</span>`
                : `<span style="color:#94a3b8; font-size:11px;">Estándar</span>`);
        // Renderizado de la celda de acciones basada en la matriz de capacidades oficiales (RBAC)
        let accionesHTML = "";
        const nombreEstudianteValido = alumno.nombreAlumno || alumno.nombre || 'Sin registrar';
        const direccionEstudianteValida = alumno.direccionAlumno || alumno.direccion || 'No especificada';
        if (window.permisoMatricula === "escritura") {
            // Modo Escritura Completa (Alta Dirección y Administradores autorizados en roles.html)
            accionesHTML = `
            <div style="display: flex; gap: 4px; justify-content: flex-start; align-items: center;">
                <button type="button" class="btn-accion-fila btn-fila-informe" data-dni="${alumno.dni}" title="Informe Pedagógico">🖨</button>
                <button type="button" class="btn-accion-fila btn-fila-boletin" data-dni="${alumno.dni}" title="Boletín Escolar">📋</button>
                <button type="button" class="btn-accion-fila" onclick="window.open('historial.html?dni=${ alumno. dni}', '_blank')" title="Historial del Legajo">📜</button>
                <button type="button" class="btn-accion-fila btn-fila-borrar" onclick="(async () => { await window.ejecutarBajaEstudianteFirestore('${alumno.dni}'); })()" title="Eliminar Alumno">🗑️</button>
            </div>
            `;
        } else {
            // Modo Consulta Estricto (Preceptores u Operadores con permiso de Lectura o Ninguno)
            accionesHTML = `
            <div style="display: flex; gap: 6px; justify-content: flex-start; align-items: center;">
                <button type="button" class="btn-accion-fila btn-fila-ficha"
                    data-nombre="${nombreEstudianteValido}"
                    data-direccion="${direccionEstudianteValida}"
                    data-tel1="${alumno.telefono1 || 'No registrado'}"
                    data-tel2="${alumno.telefono2 || 'Ninguno'}"
                    data-tutor="${alumno.nombreTutor || 'No registrado'}"
                    data-tutordni="${alumno.dniTutorAlumno || 'Sin registrar'}"
                    data-dni="${alumno.dni}"
                    style="background: #4b5563;" title="Ver Datos de Contacto">👁</button>
                <button type="button" class="btn-accion-fila btn-fila-informe" data-dni="${alumno.dni}" title="Informe Pedagógico">🖨</button>
                <button type="button" class="btn-accion-fila btn-fila-boletin" data-dni="${alumno.dni}" title="Boletín Escolar">📄</button>
            </div>
            `;
        }
               // Parche Seguro: Limpieza automática de nombres duplicados de la carga masiva
        let nombreParaMostrar = alumno.nombre || "";
        const palabrasNombre = nombreParaMostrar.trim().split(/\s+/);       
        if (palabrasNombre.length >= 4) {
            const mitad = Math.floor(palabrasNombre.length / 2);
            const primeraMitad = palabrasNombre.slice(0, mitad).join(" ").toLowerCase();
            const segundaMitad = palabrasNombre.slice(mitad).join(" ").toLowerCase();        
            if (primeraMitad === segundaMitad) {
                nombreParaMostrar = palabrasNombre.slice(0, mitad).join(" ");
            }
        }
              tr.innerHTML = `
        <td style="padding: 10px 12px;"><strong>${nombreParaMostrar}</strong><br><span style="color:#64748b; font-size:11px;">DNI: ${alumno.dni || ""}</span></td>
        <td style="padding: 10px 12px;">${celdaCurso}</td>
        <td style="padding: 10px 12px;">${celdaAuditoria}</td>
        <td style="padding: 10px 12px;">${celdaInclusion}</td>
        <td style="padding: 10px 12px; text-align: left;">${accionesHTML}</td>
        `;
        tr.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn-accion-fila')) return;
            
            // Estas dos líneas quitan la selección anterior y pintan la fila actual
            document.querySelectorAll('.fila-alumno').forEach(f => f.classList.remove('fila-seleccionada'));
            tr.classList.add('fila-seleccionada');

            if (rolNormalizado !== "preceptor") {
                cargarLegajoEnFormulario(alumno);
            }
        });
        tbodyAlumnos.appendChild(tr);
    });
    // REPARACIÓN: Asignación por recorrido para independizar el hilo del evento click
    // =========================================================================
    tbodyAlumnos.querySelectorAll('.btn-fila-informe').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const dniAlumno = e.target.getAttribute('data-dni') || e.target.closest('button').getAttribute('data-dni');
            if (dniAlumno && typeof window.emitirDocumentoIndividual === 'function') {
                await window.emitirDocumentoIndividual('INFORME', dniAlumno);
            }
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
            // Inyección dinámica y asignación de eventos para el botón de Historial ("📜")
        tbodyAlumnos.querySelectorAll('button[style*="background:#ef4444"]').forEach(btnBaja => {
            const contenedorAcciones = btnBaja.parentElement;
            if (contenedorAcciones && !contenedorAcciones.querySelector('.btn-historial-dinamico')) {
                const dniAlumnoFila = btnBaja.getAttribute('data-dni');
                
                // Crear el botón de historial con diseño Tailwind integrado
                const btnHistorial = document.createElement('button');
                btnHistorial.className = 'btn-historial-dinamico px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-semibold rounded-md border border-slate-600 transition-colors shadow-sm ml-1';
                btnHistorial.title = 'Ver Historial de Trazabilidad';
                btnHistorial.innerHTML = '📜 Historial';                
                btnHistorial.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (dniAlumnoFila) {
                        window.open(`historial.html?dni=${dniAlumnoFila}`, '_blank');
                    }
                });                
                contenedorAcciones.insertBefore(btnHistorial, btnBaja);
            }
            // Mantener el escuchador nativo de la baja preexistente
            btnBaja.addEventListener('click', (e) => {
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
            // Limpieza automática de nombres duplicados de la carga masiva al editar
        let nombreLimpioForm = alumno.nombre || "";
        const palabrasNombreForm = nombreLimpioForm.trim().split(/\s+/);
        if (palabrasNombreForm.length >= 4) {
            const mitadForm = Math.floor(palabrasNombreForm.length / 2);
            const primeraMitadForm = palabrasNombreForm.slice(0, mitadForm).join(" ").toLowerCase();
            const segundaMitadForm = palabrasNombreForm.slice(mitadForm).join(" ").toLowerCase();
            if (primeraMitadForm === segundaMitadForm) {
                nombreLimpioForm = palabrasNombreForm.slice(0, mitadForm).join(" ");
            }
        }
    document.getElementById('nombreAlumno').value = nombreLimpioForm;
    document.getElementById('dniAlumno').value = alumno.dni || "";
    document.getElementById('dniAlumno').disabled = true;
    document.getElementById('cuilAlumno').value = alumno.cuil || "";   
         // Parche Seguro: Mapeo y traducción cruzada de formatos para inputs HTML5
        const fNacRaw = alumno.fechaNacimiento || alumno.fechaNac || "";
        if (fNacRaw.includes('/')) {
            const pf = fNacRaw.split('/');
            if (pf.length === 3) {
                const dia = pf[0].trim().padStart(2, '0');
                const mes = pf[1].trim().padStart(2, '0');
                const anio = pf[2].trim();
                document.getElementById('fechaNacimiento').value = `${anio}-${mes}-${dia}`;
            }
        } else {
            document.getElementById('fechaNacimiento').value = fNacRaw;
        }
    document.getElementById('lugarNacimiento').value = alumno.lugarNacimiento || "";
    document.getElementById('nacionalidad').value = alumno.nacionalidad || "Argentina";
    document.getElementById('direccionAlumno').value = alumno.direccion || "";
    document.getElementById('telefono1').value = alumno.telefono1 || "";
    document.getElementById('telefono2').value = alumno.telefono2 || "";
    document.getElementById('nombreTutor').value = alumno.nombreTutor || "";
            // Sincronización de Géneros y Datos del Adulto Responsable
        const elGenAluForm = document.getElementById('generoAlumno');
        if (elGenAluForm) elGenAluForm.value = alumno.genero || "Masculino";
        const elDniTutForm = document.getElementById('dniTutorAlumno');
        if (elDniTutForm) elDniTutForm.value = alumno.dniTutor || "";
        const elGenTutForm = document.getElementById('generoTutor');
        if (elGenTutForm) elGenTutForm.value = alumno.generoTutor || "Masculino";
        const elEmaTutForm = document.getElementById('emailTutor');
        if (elEmaTutForm) elEmaTutForm.value = alumno.emailTutor || "";
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
        await setDoc( doc( db, "alumnos", dni), nuevoLegajo);
        localStorage. setItem('ultimoCicloTrabajado', cicloLectivo);        
                // --- Registro inmutable en el historial global del Colegio HASPEN ---
        if (typeof window.registrarEventoLegajo === 'function') {
            if (idEdicion) {
                await window.registrarEventoLegajo(dni, "MATRICULA", "MODIFICACION_LEGAJO", `Se actualizaron los datos generales del legajo digital de forma manual. Estado actual: ${estadoActual}.`);
            } else {
                await window.registrarEventoLegajo(dni, "MATRICULA", "ALTA_INSCRIPCION", `Matriculación inicial exitosa del estudiante en el sistema a través del formulario analógico.`);
            }
        }
        alert( idEdicion ? "Legajo digital modificado con éxito." : "Estudiante matriculado con éxito.");
        salirModoEdicion();
        await procesarFiltrosYNomina();
    } catch (error) {
        console.error("Error al persistir legajo:", error);
        alert("Error crítico: No se completó el resguardo remoto.");
    }
async function ejecutarBajaEstudianteFirestore(dni) {
  const confirmarBaja = await window.haspenConfirm(
    `¿Está seguro de eliminar por completo el legajo del DNI ${dni}?`,
    "Confirmar Purgado",
    "🗑️"
  );
  if (!confirmarBaja) return;

  try {
    // // --- Registro automático en el historial global antes de purgar al estudiante ---
    if (typeof window.registrarEventoLegajo === 'function') {
      await window.registrarEventoLegajo(dni, "MATRICULA", "BAJA_PURGADO", `Se eliminó por completo el legajo digital del estudiante del servidor.`);
    }
    await deleteDoc(doc(db, "alumnos", dni));
    window.haspenAlert("Legajo digital purgado correctamente.", "exito");
    if (document.getElementById('idOriginalEdicion').value === dni) salirModoEdicion();
    await procesarFiltrosYNomina();
  } catch (error) {
    console.error("Error en la baja:", error);
    window.haspenAlert("No se pudo completar la baja.", "error");
  }
}

// Vinculación global obligatoria después de definir la función
window.ejecutarBajaEstudianteFirestore = ejecutarBajaEstudianteFirestore;


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
/* ==========================================================================
   ANCLA_REPARACION_DIRECTA: Cierre del modal adaptado a la estructura actual
   ========================================================================== */
const botonCerrarInterno = document.getElementById('btnCerrarModalImpresion');
if (botonCerrarInterno) {
    botonCerrarInterno.addEventListener('click', () => {
        const mContenedor = document.getElementById('modalImpresionContenedor');
        const mCuerpo = document.getElementById('modalImpresionCuerpo');
        if (mContenedor) mContenedor.style.display = 'none';
        if (mCuerpo) mCuerpo.innerHTML = '';
    });
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
       }); // <-- ESTE ERA EL CIERRE FALTA DE LA TABLA ALUMNOS
    // ANCLA_REPARACION_LOGICA_PAGINACION_FINAL
    document.getElementById('btnPrevDesktop')?.addEventListener('click', () => {
        if (window.paginaActualAlumnos > 1) {
            window.paginaActualAlumnos--;
            const lbl = document.getElementById('lblPaginaActual');
            if (lbl) lbl.textContent = window.paginaActualAlumnos;
            if (window.currentAlumnosFiltradosCached) {
                renderizarFilasEnTabla(window.currentAlumnosFiltradosCached);
            }
        }
    });
    document.getElementById('btnNextDesktop')?.addEventListener('click', () => {
        const totalRegistros = window.totalAlumnosFiltradosPaginacion || 0;
        const limitePorPagina = window.registrosPorPaginaAlumnos || 25;
        const maxPaginas = Math.ceil(totalRegistros / limitePorPagina);
        if (window.paginaActualAlumnos < maxPaginas) {
            window.paginaActualAlumnos++;
            const lbl = document.getElementById('lblPaginaActual');
            if (lbl) lbl.textContent = window.paginaActualAlumnos;
            if (window.currentAlumnosFiltradosCached) {
                renderizarFilasEnTabla(window.currentAlumnosFiltradosCached);
            }
        }
    });
    document.getElementById('btnResetPagina')?.addEventListener('click', () => {
        window.paginaActualAlumnos = 1;
        const lbl = document.getElementById('lblPaginaActual');
        if (lbl) lbl.textContent = window.paginaActualAlumnos;
        if (window.currentAlumnosFiltradosCached) {
            renderizarFilasEnTabla(window.currentAlumnosFiltradosCached);
        }
    });
window.emitirDocumentoIndividual = async function(tipo, dni) {
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
              // ====== PARCHE V2: SANEAMIENTO DE VALORES NULOS Y NOTAS CUATRIMESTRALES ======
        let calificacionesMapeadas = {};
        try {
            const { query, where, collection, getDocs } = await import(b + 'firebase-firestore.js');
            const consultaNotas = query(
                collection(db, "alumnos_calificaciones"),
                where("alumnoDni", "==", String(dni).trim())
            );
            const snapCalificaciones = await getDocs(consultaNotas);           
            snapCalificaciones.forEach(cDoc => {
                const cData = cDoc.data();
                if (cData && cData.materia) {
                    const claveMateriaOriginal = cData.materia.trim();
                    const n = cData.notes || cData.notas || {};
                    const t1 = n.trim1 || {};
                    const t2 = n.trim2 || {};
                    
                                        // ====== PARCHE V4: ALINEACIÓN ATÓMICA CON CONSTRUIREMEDIAHOJA ======
                    calificacionesMapeadas[claveMateriaOriginal] = {
                        // Mapeo exacto de las claves que consume tu HTML final
                        c1_inf1: t1.n1 !== null && t1.n1 !== undefined && t1.n1 !== "" ? String(t1.n1) : "-",
                        c1_inf2: t1.n2 !== null && t1.n2 !== undefined && t1.n2 !== "" ? String(t1.n2) : "-",
                        c1_forta: t1.ef !== null && t1.ef !== undefined && t1.ef !== "" ? String(t1.ef) : "-",
                        c1_nota: cData.notaCuatrimestre1 !== null && cData.notaCuatrimestre1 !== undefined && cData.notaCuatrimestre1 !== "" ? String(cData.notaCuatrimestre1) : "-",                        
                        c2_inf1: t2.n1 !== null && t2.n1 !== undefined && t2.n1 !== "" ? String(t2.n1) : "-",
                        c2_inf2: t2.n2 !== null && t2.n2 !== undefined && t2.n2 !== "" ? String(t2.n2) : "-",
                        c2_forta: t2.ef !== null && t2.ef !== undefined && t2.ef !== "" ? String(t2.ef) : "-",
                        c2_nota: cData.notaCuatrimestre2 !== null && cData.notaCuatrimestre2 !== undefined && cData.notaCuatrimestre2 !== "" ? String(cData.notaCuatrimestre2) : "-",                        
                        nota_final: cData.notaFinal !== null && cData.notaFinal !== undefined && cData.notaFinal !== "" ? String(cData.notaFinal) : "-",
                        diciembre: cData.diciembre !== null && cData.diciembre !== undefined && cData.diciembre !== "" ? String(cData.diciembre) : "-",
                        febrero: cData.febrero !== null && cData.febrero !== undefined && cData.febrero !== "" ? String(cData.febrero) : "-",
                        observaciones: cData.observaciones || ""
                    };
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
function construirMediaHojaInformePedagogico(alumno, cursoTexto, materias, calificaciones, inasistencias) {
    let filasHTML = "";
    if (materias.length === 0) {
        filasHTML = `<tr><td colspan="10" style="padding:10px; color:#666;">Sin asignaturas asignadas.</td></tr>`;
    } else {
        materias.forEach(materia => {
            const c = calificaciones[materia] || {};            
            // ====== PARCHE V4.1: REEMPLAZO COERCITIVO DE CEROS POR GUIONES DE PROCESO ======
            const inf1_1   = c.c1_inf1   && c.c1_inf1   !== "0" ? c.c1_inf1   : "-";
            const inf1_2   = c.c1_inf2   && c.c1_inf2   !== "0" ? c.c1_inf2   : "-";
            const forta1   = c.c1_forta  && c.c1_forta  !== "0" ? c.c1_forta  : "-";
            const notaC1   = c.c1_nota   && c.c1_nota   !== "0" ? c.c1_nota   : "-";
            const inf2_1   = c.c2_inf1   && c.c2_inf1   !== "0" ? c.c2_inf1   : "-";
            const inf2_2   = c.c2_inf2   && c.c2_inf2   !== "0" ? c.c2_inf2   : "-";
            const forta2   = c.c2_forta  && c.c2_forta  !== "0" ? c.c2_forta  : "-";
            const notaC2   = c.c2_nota   && c.c2_nota   !== "0" ? c.c2_nota   : "-";
            const finalNota = c.nota_final && c.nota_final !== "0" ? c.nota_final : "-";            
                       // ====== PARCHE V5: OPTIMIZACIÓN DE LEGIBILIDAD Y ESCALA TIPOGRÁFICA ======
            filasHTML += `
            <tr>
                <td style="text-align:left; font-weight:bold; font-size:9.5px; padding:4px 3px;">${materia}</td>
                <td style="font-size:11px; font-weight:500;">${inf1_1}</td>
                <td style="font-size:11px; font-weight:500;">${inf1_2}</td>
                <td style="font-size:11px; font-weight:500;">${forta1}</td>
                <td style="background:#f1f5f9; font-weight:bold; font-size:12px; color:#1e293b;">${notaC1}</td>
                <td style="font-size:11px; font-weight:500;">${inf2_1}</td>
                <td style="font-size:11px; font-weight:500;">${inf2_2}</td>
                <td style="font-size:11px; font-weight:500;">${forta2}</td>
                <td style="background:#f1f5f9; font-weight:bold; font-size:12px; color:#1e293b;">${notaC2}</td>
                <td style="background:#e2e8f0; font-weight:bold; font-size:12px; color:#0f172a;">${finalNota}</td>
            </tr>
            `;
        });

    // =========================================================================
// UBICACIÓN: Final de la función construirMediaHojaInformePedagogico
// REEMPLAZO DEFINITIVO: Recuperación del diseño institucional del Colegio HASPEN
// =========================================================================
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
    }
    window.emitirDocumentosEnLote = async function(tipo) {
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


})();
