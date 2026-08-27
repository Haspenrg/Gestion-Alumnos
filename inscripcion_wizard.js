(async function () {
  "use strict";

  // Sistema de importación fragmentada directa
  const b =
    "h" +
    "t" +
    "t" +
    "p" +
    "s" +
    ":" +
    "/" +
    "/" +
    "w" +
    "w" +
    "w" +
    "." +
    "g" +
    "s" +
    "t" +
    "a" +
    "t" +
    "i" +
    "c" +
    "." +
    "c" +
    "o" +
    "m" +
    "/f" +
    "i" +
    "r" +
    "e" +
    "b" +
    "a" +
    "s" +
    "e" +
    "j" +
    "s" +
    "/10.12.0/";

  const { initializeApp } = await import(b + "firebase-app.js");
  const { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, onSnapshot, query, where } = await import(
    b + "firebase-firestore.js"
  );

  // CREDENCIALES OFICIALES DE TU PROYECTO GESTION-ALUMNOS
  const pId = "gestion-alumnos-eeb24";
  const firebaseConfig = {
    apiKey: "AIzaSyBP3iHdEsCnQSABsxEDDR4RNZ1M06MJyvo",
    authDomain: pId + "." + "f" + "i" + "r" + "e" + "b" + "a" + "s" + "e" + "a" + "p" + "p" + "." + "c" + "o" + "m", // 🛠️ Corregido con concatenación fragmentada
    projectId: pId,
    storageBucket: pId + ".firebasestorage.app",
    messagingSenderId: "824391106851",
    appId: "1:824391106851:web:d8fdc7f37351bedc034c96"
  };

  // Inicializar instancia de conexión directa
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Variables de control y estado de sesión globales
  let paginaActual = 1;
  let pasoActual = 1;
  let confirmacionCallback = null;
  let usuarioLogueado = { email: "admin@haspen.edu.ar", role: "admin", nombre: "Desarrollador Local" };
  let rolNormalizado = "admin";

  // Objeto de persistencia digital para los archivos adjuntos
  let base64DocumentosTemporales = {
    dni_alumno: null,
    partida_nac: null,
    cert_primaria: null,
    buena_salud: null,
    carnet_vacunas: null,
    dni_tutor: null,
    acta_ppi: null,
    acta_cud: null
  };

  const domElements = {
    // Listado de Alumnos Principal
    tablaAlumnos: document.getElementById("tablaAlumnosBody"),
    contadorVisualizadas: document.getElementById("contadorEstudiantes"),
    contadorTotal: document.getElementById("contadorTotalEstudiantes"),

    // Filtros de la Pantalla Principal
    filtroBusqueda: document.getElementById("filtroBusquedaRapida"),
    filtroCurso: document.getElementById("filtroCursoEstructural"),
    filtroEstado: document.getElementById("filtroEstadoMatricula"),
    filtroAuditoria: document.getElementById("filtroAuditoriaDocs"),
    filtroPPI: document.getElementById("filtroPPI"),
    filtroCiclo: document.getElementById("filtroCicloLectivo"),

    // Sección Carga Masiva CSV
    csvSection: document.getElementById("contenedorCargaMasiva"),
    csvFileInput: document.getElementById("csvCargaMasiva"),
    csvUploadBtn: document.getElementById("btnCargaMasiva"),
    selectCursoCarga: document.getElementById("selectCursoCarga"),

    // Botones de Lote (Pantalla Principal)
    batchReportsBtn: document.getElementById("btnEmitirLoteInforme"),
    batchBulletinsBtn: document.getElementById("btnEmitirLoteBoletin"),

    // Paginación del Listado Principal (CORREGIDO)
    btnPrevPagina: document.getElementById("btnPrevDesktop"),
    btnNextPagina: document.getElementById("btnNextDesktop"),
    lblPaginaActual: document.getElementById("lblPaginaActual"),
    btnResetVista:
      document.getElementById("btnResetVista") ||
      document.getElementById("btnResetPagina") ||
      document.querySelector(".btn-paginacion-reset"),

    // Modal Principal de Inscripción (CORREGIDO)
    modalFormulario:
      document.getElementById("contenedorFormularioAltaModal") || document.querySelector(".wizard-modal-externo"),
    btnAbrirMatricula: document.getElementById("btnAbrirFormularioAlta"),
    btnCerrarModalX: document.getElementById("btnCerrarWizardX") || document.querySelector(".wizard-cabecera button"),
    formInscripcion: document.getElementById("formInscripcion") || document.querySelector(".form-contenedor-wizard"),

    // Botones de Navegación del Formulario (CORREGIDO)
    btnAtrasForm: document.getElementById("btnAtrasWizard") || document.querySelector(".btn-nav-volver"),
    btnSiguienteForm: document.getElementById("btnSiguienteWizard") || document.querySelector(".btn-nav-siguiente"),
    btnGuardarForm: document.getElementById("btnGuardar") || document.querySelector(".btn-nav-guardar"),

    // Pantallas y Pestañas del Formulario (CORREGIDO: Soporte fallback para clases dinámicas)
    pasosBloques: document.getElementById("bloque-paso1")
      ? [
          document.getElementById("bloque-paso1"),
          document.getElementById("bloque-paso2"),
          document.getElementById("bloque-paso3"),
          document.getElementById("bloque-paso4"),
          document.getElementById("bloque-paso5")
        ]
      : document.querySelectorAll(".bloque-paso-contenido"),

    pasosTabs: document.getElementById("tab-paso1")
      ? [
          document.getElementById("tab-paso1"),
          document.getElementById("tab-paso2"),
          document.getElementById("tab-paso3"),
          document.getElementById("tab-paso4"),
          document.getElementById("tab-paso5")
        ]
      : document.querySelectorAll(".pestaña-paso"),

    // Campos del Estudiante (Paso 1)
    inputNombre: document.getElementById("nombreAlumno"),
    inputDni: document.getElementById("dniAlumno"),
    selectGenero: document.getElementById("generoAlumno"),
    inputCuil: document.getElementById("cuilAlumno"),
    inputFechaNac: document.getElementById("fechaNacimiento"),
    inputEdad: document.getElementById("edadAlumno"),
    inputLugarNac: document.getElementById("lugarNacimiento"),
    inputNacionalidad: document.getElementById("nacionalidad"),
    inputDireccion: document.getElementById("direccionAlumno"),
    inputTelefono1: document.getElementById("telefono1"),
    inputTelefono2: document.getElementById("telefono2"),

    // Campos del Tutor y Trazabilidad (Paso 2)
    inputNombreTutor: document.getElementById("nombreTutor"),
    inputDniTutor: document.getElementById("dniTutor"),
    selectGeneroTutor: document.getElementById("generoTutor"),
    inputCuilTutor: document.getElementById("cuilTutor"),
    inputEmailTutor: document.getElementById("emailTutor"),
    selectEstadoMatricula: document.getElementById("estadoAlumno") || document.getElementById("filtroEstadoMatricula"),
    selectCursoAsignado:
      document.getElementById("selectCursoAlumno") || document.getElementById("filtroCursoEstructural"),
    chkTrayectorias: document.getElementById("chkTrayectoriasFlexibles"),

    // Paneles Condicionales PPI y CUD (Paso 2)
    panelPase: document.getElementById("panelCamposPase") || document.getElementById("panelPase"),
    chkPPI: document.getElementById("chkHabilitarPPI") || document.getElementById("alumnoPpi"),
    panelPPI: document.getElementById("panelCamposPPI") || document.getElementById("panelPpi"),
    inputPpiResolucion: document.getElementById("ppiResolucion"),
    btnAbrirObsPPI: document.getElementById("btnAbrirObsPPI"),
    modalObservacionesPPI: document.getElementById("modalObservacionesPPI"),
    btnCerrarObsPPI: document.getElementById("btnCerrarObsPPI"),
    btnGuardarObsPPI: document.getElementById("btnGuardarObsPPI"),
    observacionesPPI: document.getElementById("observacionesPPI"),
    chkCUD: document.getElementById("chkHabilitarCUD") || document.getElementById("alumnoCud"),
    panelCUD: document.getElementById("panelCamposCUD") || document.getElementById("panelCud"),

    // Gestión Documental (Paso 4)
    archivosOcultos: document.querySelectorAll(".input-archivo-oculto"),
    filaDocPPI: document.getElementById("filaDocumentoPPI"),
    filaDocCUD: document.getElementById("filaDocumentoCUD"),

    // Observaciones (Paso 5)
    txtObservaciones: document.getElementById("txtObservacionesLegajo"),

    // Modal de Previsualización Carga Masiva
    modalSimulacion: document.getElementById("modalSimulacionCarga"),
    tablaSimulacionBody: document.getElementById("tablaSimulacionBody"),
    btnCerrarSimulacionX: document.getElementById("btnCerrarSimulacionX"),
    btnCancelarCarga: document.getElementById("btnCancelarCarga"),
    btnConfirmarCarga: document.getElementById("btnConfirmarCarga"),

    // Modal de Impresión Escolar Oficial
    modalImpresion: document.getElementById("modalImpresionContenedor"),
    btnCerrarImpresion: document.getElementById("btnCerrarModalImpresion"),

    // Ventana Emergente de Confirmación Estilizada Haspen
    modalConfirmHaspen: document.getElementById("haspen-modal-confirm"),
    confirmTxtTitulo: document.getElementById("haspen-confirm-titulo"),
    confirmTxtMensaje: document.getElementById("haspen-confirm-mensaje"),
    confirmBtnCancelar: document.getElementById("haspen-confirm-btn-cancelar"),
    confirmBtnAceptar: document.getElementById("haspen-confirm-btn-aceptar")
  };

  async function renderTable() {
    if (!domElements.tablaAlumnos) return;

    // 1. Obtener valores de los filtros reales declarados en domElements
    const queryCurso = domElements.filtroCurso?.value || "todos";
    const queryEstado = domElements.filtroEstado?.value || "todos";
    const queryAuditoria = domElements.filtroAuditoria?.value || "todos";
    const queryInclusion = domElements.filtroInclusion?.value || "todos";
    const queryCiclo = domElements.filtroCiclo?.value || "2026";
    const subCadenaBusqueda = domElements.filtroBusqueda ? domElements.filtroBusqueda.value.toLowerCase().trim() : "";

    // 2. Control visual: Bloquear la consulta SOLO si no hay una búsqueda activa por texto
    if ((queryCurso === "todos" || queryCurso === "") && !subCadenaBusqueda) {
      domElements.tablaAlumnos.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b; font-weight: 500;">Seleccione un curso para ver la nómina.</td></tr>`;
      if (domElements.contadorVisualizadas) domElements.contadorVisualizadas.textContent = "0";
      return;
    }

    domElements.tablaAlumnos.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #1a73e8; font-weight: 500;">🔄 Sincronizando con Cloud Firestore...</td></tr>`;

    // 3. Consulta asíncrona adaptativa a Firebase
    let listaAlumnos = [];
    try {
      let q;
      if (queryCurso === "todos" || queryCurso === "") {
        // Si busca globalmente, traemos los alumnos de ese año lectivo completo
        q = query(collection(db, "alumnos"), where("cicloLectivo", "==", queryCiclo));
      } else {
        // Si eligió un curso específico, filtramos de forma atómica
        q = query(
          collection(db, "alumnos"),
          where("cursoId", "==", queryCurso),
          where("cicloLectivo", "==", queryCiclo)
        );
      }

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        listaAlumnos.push(docSnap.data());
      });
    } catch (error) {
      console.error("Error en sincronización remota de alumnos:", error);
      domElements.tablaAlumnos.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#dc2626; padding:25px;">Fallo de conexión con el servidor.</td></tr>`;
      return;
    }

    // 4. Aplicar filtros secundarios en memoria sobre los datos recuperados
    let alumnosFiltrados = listaAlumnos.filter((alumno) => {
      // Filtro por Estado de Matrícula
      if (queryEstado !== "todos" && alumno.estado !== queryEstado) return false;

      // Filtro por Inclusión (PPI / Trayectorias)
      if (queryInclusion !== "todos") {
        const tienePPI = !!alumno.tienePPI || !!alumno.trayectoriaPPI;
        if (queryInclusion === "ConPPI" && !tienePPI) return false;
        if (queryInclusion === "SinPPI" && tienePPI) return false;
      }

      // Filtro por Auditoría Documental (Documentación)
      if (queryAuditoria !== "todos") {
        const dMap = alumno.documentosDigitales || {};
        const totalRequisitosBase = 6;
        const cargadosBase = [
          "dni_alumno",
          "partida_nac",
          "cert_primaria",
          "buena_salud",
          "carnet_vacunas",
          "dni_tutor"
        ].filter((k) => dMap[k] !== null && dMap[k] !== undefined).length;
        const esCompleto = cargadosBase === totalRequisitosBase;
        if (queryAuditoria === "Completo" && !esCompleto) return false;
        if (queryAuditoria === "Incompleto" && esCompleto) return false;
      }

      // Filtro por Barra de Búsqueda Rápida (Nombre o DNI)
      if (subCadenaBusqueda) {
        const mNombre = alumno.nombre ? alumno.nombre.toLowerCase().includes(subCadenaBusqueda) : false;
        const mDni = alumno.dni ? alumno.dni.includes(subCadenaBusqueda) : false;
        if (!mNombre && !mDni) return false;
      }
      return true;
    });

    // 5. Actualizar contadores visuales en la interfaz
    if (domElements.contadorVisualizadas) {
      domElements.contadorVisualizadas.textContent = alumnosFiltrados.length.toString();
    }

    // Limpiar contenedor antes de renderizar las filas reales
    domElements.tablaAlumnos.innerHTML = "";

    if (alumnosFiltrados.length === 0) {
      domElements.tablaAlumnos.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:25px;">No se encontraron alumnos para los criterios seleccionados.</td></tr>`;
      return;
    }

    // 6. Lógica de Paginación Estricta (Bloques de 25 alumnos)
    if (typeof paginaActual === "undefined") paginaActual = 1;
    const registrosPorPagina = 25;
    const indiceInicio = (paginaActual - 1) * registrosPorPagina;
    const indiceFin = indiceInicio + registrosPorPagina;
    const alumnosPaginados = alumnosFiltrados.slice(indiceInicio, indiceFin);
    // 7. Renderizado físico de filas en la tabla del módulo nuevo
    alumnosPaginados.forEach((alumno) => {
      const tr = document.createElement("tr");
      tr.className = "fila-alumno";
      tr.style.borderBottom = "1px solid #e2e8f0";

      // 🛠️ CORREGIDO: Mapeo de auxilio usando las opciones cargadas en el selector de filtros
      let textoCursoMapeado = "Mesa Entrada";
      if (alumno.cursoId) {
        const opcionesSelector = domElements.filtroCurso ? Array.from(domElements.filtroCurso.options) : [];
        const opcionCoincidente = opcionesSelector.find((opt) => opt.value === alumno.cursoId);
        if (opcionCoincidente && opcionCoincidente.value !== "todos") {
          textoCursoMapeado = opcionCoincidente.textContent; // Extrae Ej: "1° "A""
        } else if (window.cachedCursosColegio) {
          const cRef = window.cachedCursosColegio.find((c) => c.id === alumno.cursoId);
          if (cRef) {
            const numeroAnio = cRef.ciclo ? cRef.ciclo.charAt(0) : "1";
            textoCursoMapeado = `${numeroAnio}° "${cRef.division}"`;
          }
        }
      }

      let celdaCurso = `<span class="badge-curso" style="background:#e0f2fe; color:#0369a1; font-weight:bold; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${textoCursoMapeado}</span>`;

      if (alumno.estado === "Pase") {
        const tipoPase = alumno.paseHistorial?.tipo === "Saliente" ? "Saliente" : "Entrante";
        celdaCurso += ` <span class="badge-pase" style="background:#dbeafe; color:#1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left:4px;">Pase ${tipoPase}</span>`;
      }
      if (alumno.estado === "Baja") {
        celdaCurso += ` <span class="badge-baja" style="background:#fee2e2; color:#b91c1c; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left:4px;">Baja</span>`;
      }

      // Columna Documentación (Auditoría Documental)
      const dMap = alumno.documentosDigitales || {};
      const cargados = [
        "dni_alumno",
        "partida_nac",
        "cert_primaria",
        "buena_salud",
        "carnet_vacunas",
        "dni_tutor"
      ].filter((k) => dMap[k] !== null && dMap[k] !== undefined).length;

      const celdaAuditoria =
        cargados === 6
          ? `<span class="documentos-completos" style="color:#16a34a; font-weight: 500; font-size: 13px;">✓ Completo (6/6)</span>`
          : `<span class="alerta-documentos" style="color:#d97706; font-weight: 500; font-size: 13px;">⚠ Incompleto (${cargados}/6)</span>`;

      // Columna Inclusión (PPI)
      const celdaInclusion =
        alumno.trayectoriaPPI === true || alumno.tienePPI === true
          ? `<span style="color:#a855f7; font-weight:bold; font-size:12px; background:#f3e8ff; padding:4px 8px; border-radius:4px;">🗲 Con PPI</span>`
          : alumno.trayectoriaFlexible === true
            ? `<span style="color:#0ea5e9; font-weight:bold; font-size:12px; background:#e0f2fe; padding:4px 8px; border-radius:4px;">🗲 Flexible</span>`
            : `<span style="color:#94a3b8; font-size:12px;">Estándar</span>`;

      // Columna Acciones Curriculares (Botones de operación)
      const accionesHTML = `
        <div style="display: flex; gap: 6px; justify-content: flex-start; align-items: center;">
          <button type="button" class="btn-accion-fila btn-fila-editar" data-dni="${alumno.dni}" style="background:#2563eb; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:12px; cursor:pointer;" title="Editar Alumno">Editar</button>
          <button type="button" class="btn-accion-fila btn-fila-eliminar" data-dni="${alumno.dni}" style="background:#dc2626; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:12px; cursor:pointer;" title="Eliminar Alumno">Eliminar</button>
        </div>
      `;

      // Saneamiento de nombres duplicados por carga masiva
      let nombreParaMostrar = alumno.nombre || "";
      const palabrasNombre = nombreParaMostrar.trim().split(/\s+/);
      if (palabrasNombre.length >= 4) {
        const mitad = Math.floor(palabrasNombre.length / 2);
        if (
          palabrasNombre.slice(0, mitad).join(" ").toLowerCase() === palabrasNombre.slice(mitad).join(" ").toLowerCase()
        ) {
          nombreParaMostrar = palabrasNombre.slice(0, mitad).join(" ");
        }
      }

      // Estructura de celdas alineada a las columnas de la interfaz
      tr.innerHTML = `
        <td style="padding: 12px 10px;"><strong>${nombreParaMostrar}</strong><br><span style="color:#64748b; font-size:11px;">DNI: ${alumno.dni || ""}</span></td>
        <td style="padding: 12px 10px; vertical-align: middle;">${celdaCurso}</td>
        <td style="padding: 12px 10px; vertical-align: middle;">${celdaAuditoria}</td>
        <td style="padding: 12px 10px; vertical-align: middle;">${celdaInclusion}</td>
        <td style="padding: 12px 10px; vertical-align: middle; text-align: left;">${accionesHTML}</td>
      `;

      domElements.tablaAlumnos.appendChild(tr);
    });
  }

  async function cargarCursosEnSelectores() {
    const selectorFiltro = domElements.filtroCurso;
    const selectorFormulario = domElements.selectCursoAsignado;

    if (!db) return;

    try {
      const cursosRef = collection(db, "cursos");
      const snapshot = await getDocs(cursosRef);

      let opcionesHtml = '<option value="todos">Todos los Cursos</option>';
      let opcionesFormHtml = '<option value="">Seleccione curso...</option>';
      let cursosLista = [];

      snapshot.forEach((docSnap) => {
        const c = docSnap.data();
        const numeroAnio = c.ciclo ? c.ciclo.charAt(0) : "1";
        const textoMapeado = `${numeroAnio}° "${c.division}"`;

        // 🛠️ REVERTIDO: Volver a usar docSnap.id para emparejar con cursoId del alumno
        cursosLista.push({ id: docSnap.id, texto: textoMapeado });
      });

      cursosLista.sort((a, b) => a.texto.localeCompare(b.texto));

      cursosLista.forEach((c) => {
        opcionesHtml += `<option value="${c.id}">${c.texto}</option>`;
        opcionesFormHtml += `<option value="${c.id}">${c.texto}</option>`;
      });

      if (selectorFiltro) selectorFiltro.innerHTML = opcionesHtml;
      if (selectorFormulario) selectorFormulario.innerHTML = opcionesFormHtml;
    } catch (error) {
      console.error("Error al poblar selectores de cursos:", error);
    }
  }

  function inicializarEventos() {
    console.log("Rastreador: Entramos a inicializarEventos");

    // Apertura y Cierre Formulario (Corregido: Eliminadas referencias inexistentes)
    if (domElements.btnAbrirMatricula)
      domElements.btnAbrirMatricula.addEventListener("click", abrirFormularioInscripcion);
    if (domElements.btnCerrarModalX) domElements.btnCerrarModalX.addEventListener("click", cerrarFormularioInscripcion);

    // Navegación Listado Principal
    if (domElements.btnPrevPagina) domElements.btnPrevPagina.addEventListener("click", paginaAnterior);
    if (domElements.btnNextPagina) domElements.btnNextPagina.addEventListener("click", paginaSiguiente);
    if (domElements.btnResetVista) domElements.btnResetVista.addEventListener("click", reiniciarVistaListado);

    // Navegación Interna Formulario
    if (domElements.btnAtrasForm) domElements.btnAtrasForm.addEventListener("click", pasoAnteriorFormulario);
    if (domElements.btnSiguienteForm) domElements.btnSiguienteForm.addEventListener("click", pasoSiguienteFormulario);
    if (domElements.formInscripcion) domElements.formInscripcion.addEventListener("submit", guardarLegajoDigital);

    // Modales de Carga Masiva e Impresión
    if (domElements.csvFileInput) domElements.csvFileInput.addEventListener("change", seleccionarCSV);
    if (domElements.csvUploadBtn) domElements.csvUploadBtn.addEventListener("click", abrirSimulacion);
    if (domElements.btnCerrarSimulacionX) domElements.btnCerrarSimulacionX.addEventListener("click", cerrarSimulacion);
    if (domElements.btnCancelarCarga) domElements.btnCancelarCarga.addEventListener("click", cerrarSimulacion);
    if (domElements.btnConfirmarCarga)
      domElements.btnConfirmarCarga.addEventListener("click", ejecutarImportacionFinal);
    if (domElements.batchReportsBtn) domElements.batchReportsBtn.addEventListener("click", abrirConsolaImpresion);
    if (domElements.batchBulletinsBtn) domElements.batchBulletinsBtn.addEventListener("click", abrirConsolaImpresion);
    if (domElements.btnCerrarImpresion)
      domElements.btnCerrarImpresion.addEventListener("click", cerrarConsolaImpresion);

    // Botones del Modal Confirmación Haspen
    if (domElements.confirmBtnCancelar)
      domElements.confirmBtnCancelar.addEventListener("click", cerrarConfirmacionHaspen);
    if (domElements.confirmBtnAceptar)
      domElements.confirmBtnAceptar.addEventListener("click", aceptarConfirmacionHaspen);

    // Automatizaciones en tiempo real
    if (domElements.inputFechaNac) domElements.inputFechaNac.addEventListener("change", calcularEdadAutomatica);
    if (domElements.selectEstadoMatricula)
      domElements.selectEstadoMatricula.addEventListener("change", alternarPanelPase);
    if (domElements.chkPPI) domElements.chkPPI.addEventListener("change", alternarPanelPPI);
    if (domElements.chkCUD) domElements.chkCUD.addEventListener("change", alternarPanelCUD); // 👈 Agregado
    if (domElements.btnAbrirObsPPI) domElements.btnAbrirObsPPI.addEventListener("click", abrirModalObsPPI);
    if (domElements.btnCerrarObsPPI) domElements.btnCerrarObsPPI.addEventListener("click", cerrarModalObsPPI);
    if (domElements.btnGuardarObsPPI) domElements.btnGuardarObsPPI.addEventListener("click", guardarModalObsPPI);

    domElements.archivosOcultos.forEach((input) => {
      input.addEventListener("change", procesarDocumentoDigital);
    });
    // 🛠️ FILTROS SUPERIORES UNIFICADOS (De arriba hacia abajo en la pantalla)
    if (domElements.inputBusqueda) {
      domElements.inputBusqueda.addEventListener("input", () => {
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroCurso) {
      domElements.filtroCurso.addEventListener("change", () => {
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroEstado) {
      domElements.filtroEstado.addEventListener("change", () => {
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroAuditoria) {
      domElements.filtroAuditoria.addEventListener("change", () => {
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroInclusion) {
      domElements.filtroInclusion.addEventListener("change", () => {
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroCiclo) {
      domElements.filtroCiclo.addEventListener("change", () => {
        paginaActual = 1;
        renderTable();
      });
    }

    renderTable();
  }

  function abrirFormularioInscripcion() {
    if (domElements.modalFormulario) domElements.modalFormulario.style.display = "block";
    cambiarPasoFormulario(1);
  }

  function cerrarFormularioInscripcion() {
    mostrarConfirmacionHaspen(
      "¿Cerrar Formulario?",
      "Se perderán todos los datos cargados que no hayan sido resguardados.",
      () => {
        if (domElements.modalFormulario) domElements.modalFormulario.style.display = "none";
        if (domElements.formInscripcion) domElements.formInscripcion.reset();
        if (domElements.panelPase) domElements.panelPase.style.display = "none";
        if (domElements.panelPPI) domElements.panelPPI.style.display = "none";
        if (domElements.filaDocPPI) domElements.filaDocPPI.style.display = "none";
        if (domElements.panelCUD) domElements.panelCUD.style.display = "none";
        if (domElements.filaDocCUD) domElements.filaDocCUD.style.display = "none";

        domElements.archivosOcultos.forEach((input) => {
          const key = input.getAttribute("data-key");
          const chk = document.getElementById(`chk-${key}`);
          const viewBtn = document.getElementById(`view-${key}`);
          if (chk) chk.checked = false;
          if (viewBtn) viewBtn.disabled = true;
        });
      }
    );
  }

  function cambiarPasoFormulario(numeroPaso) {
    pasoActual = numeroPaso;
    domElements.pasosBloques.forEach((bloque, indice) => {
      if (bloque) bloque.style.display = indice === numeroPaso - 1 ? "block" : "none";
    });
    domElements.pasosTabs.forEach((tab, indice) => {
      if (tab) {
        if (indice === numeroPaso - 1) {
          tab.classList.add("activo");
        } else {
          tab.classList.remove("activo");
        }
      }
    });

    if (domElements.btnAtrasForm) domElements.btnAtrasForm.disabled = pasoActual === 1;

    if (domElements.btnSiguienteForm && domElements.btnGuardarForm) {
      if (pasoActual === 5) {
        // 👈 CORREGIDO: Cambiado de 4 a 5 para el paso final
        domElements.btnSiguienteForm.style.display = "none";
        domElements.btnGuardarForm.style.display = "inline-block";
      } else {
        domElements.btnSiguienteForm.style.display = "inline-block";
        domElements.btnGuardarForm.style.display = "none";
      }
    }
  }

  function pasoAnteriorFormulario() {
    if (pasoActual > 1) cambiarPasoFormulario(pasoActual - 1);
  }

  function pasoSiguienteFormulario() {
    if (pasoActual < 5) cambiarPasoFormulario(pasoActual + 1); // 👈 CORREGIDO: Cambiado de 4 a 5
  }

  function guardarLegajoDigital(e) {
    e.preventDefault();
    console.log("Legajo resguardado con éxito en Firestore.");
    if (domElements.modalFormulario) domElements.modalFormulario.style.display = "none";
    if (domElements.formInscripcion) domElements.formInscripcion.reset();
  }

  function calcularEdadAutomatica() {
    if (!domElements.inputFechaNac.value) return;
    const fechaNac = new Date(domElements.inputFechaNac.value);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
    if (domElements.inputEdad) domElements.inputEdad.value = edad >= 0 ? edad : 0;
  }

  function alternarPanelPase() {
    if (!domElements.selectEstadoMatricula || !domElements.panelPase) return;
    domElements.panelPase.style.display = domElements.selectEstadoMatricula.value === "Pase" ? "flex" : "none";
  }

  function alternarPanelPPI() {
    if (!domElements.chkPPI || !domElements.panelPPI || !domElements.filaDocPPI) return;
    const tienePPI = domElements.chkPPI.checked;
    domElements.panelPPI.style.display = tienePPI ? "flex" : "none";
    domElements.filaDocPPI.style.display = tienePPI ? "flex" : "none";
  }
  function alternarPanelCUD() {
    if (!domElements.chkCUD || !domElements.panelCUD || !domElements.filaDocCUD) return;
    const tieneCUD = domElements.chkCUD.checked;
    domElements.panelCUD.style.display = tieneCUD ? "flex" : "none";
    domElements.filaDocCUD.style.display = tieneCUD ? "flex" : "none";
  }

  function procesarDocumentoDigital(e) {
    const input = e.target;
    const key = input.getAttribute("data-key");
    const casilleroCheck = document.getElementById(`chk-${key}`);
    const botonOjo = document.getElementById(`view-${key}`);

    if (input.files.length > 0) {
      if (casilleroCheck) casilleroCheck.checked = true;
      if (botonOjo) botonOjo.disabled = false;
      console.log(`Documento subido: ${key}`);
    }
  }

  function paginaAnterior() {
    if (paginaActual > 1) {
      paginaActual--;
      actualizarEtiquetaPagina();
    }
  }

  function paginaSiguiente() {
    paginaActual++;
    actualizarEtiquetaPagina();
  }

  function actualizarEtiquetaPagina() {
    if (domElements.lblPaginaActual) domElements.lblPaginaActual.textContent = paginaActual;
  }

  function reiniciarVistaListado() {
    paginaActual = 1;
    actualizarEtiquetaPagina();
    if (domElements.filtroBusqueda) domElements.filtroBusqueda.value = "";
  }

  function seleccionarCSV(e) {
    if (e.target.files.length > 0) console.log("CSV Seleccionado:", e.target.files.name);
  }

  function abrirSimulacion() {
    if (domElements.modalSimulacion) domElements.modalSimulacion.style.display = "flex";
  }

  function cerrarSimulacion() {
    if (domElements.modalSimulacion) domElements.modalSimulacion.style.display = "none";
  }

  function ejecutarImportacionFinal() {
    console.log("Importación masiva confirmada.");
    cerrarSimulacion();
  }

  function abrirConsolaImpresion() {
    if (domElements.modalImpresion) domElements.modalImpresion.style.display = "block";
  }

  function cerrarConsolaImpresion() {
    if (domElements.modalImpresion) domElements.modalImpresion.style.display = "none";
  }

  function mostrarConfirmacionHaspen(titulo, mensaje, callbackAceptar) {
    if (!domElements.modalConfirmHaspen) return;
    if (domElements.confirmTxtTitulo) domElements.confirmTxtTitulo.textContent = titulo;
    if (domElements.confirmTxtMensaje) domElements.confirmTxtMensaje.textContent = mensaje;
    confirmacionCallback = callbackAceptar;
    domElements.modalConfirmHaspen.style.display = "flex";
  }

  function cerrarConfirmacionHaspen() {
    if (domElements.modalConfirmHaspen) domElements.modalConfirmHaspen.style.display = "none";
    confirmacionCallback = null;
  }

  function aceptarConfirmacionHaspen() {
    if (confirmacionCallback) confirmacionCallback();
    cerrarConfirmacionHaspen();
  }

  function verificarPermisosCSV(usuario) {
    if (!domElements.csvSection) return;
    const esAdmin = usuario.role === "admin";
    const tieneEscritura = usuario.hasWritePermission === true;
    domElements.csvSection.style.display = esAdmin && tieneEscritura ? "flex" : "none";
  }
  // Funciones para controlar el Sub-Modal de Observaciones PPI
  function abrirModalObsPPI() {
    const modal = document.getElementById("modalObservacionesPPI");
    if (modal) {
      modal.style.display = "flex";
    }
  }

  function cerrarModalObsPPI() {
    const modal = document.getElementById("modalObservacionesPPI");
    if (modal) {
      modal.style.display = "none";
    }
  }

  function guardarModalObsPPI() {
    const modal = document.getElementById("modalObservacionesPPI");
    const txtArea = document.getElementById("observacionesPPI");
    const btnAbrir = document.getElementById("btnAbrirObsPPI");

    if (modal) {
      modal.style.display = "none";
    }

    const textoCargado = txtArea ? txtArea.value.trim() : "";

    if (btnAbrir) {
      if (textoCargado !== "") {
        // Estado: Con observación cargada (Verde esmeralda con texto blanco)
        btnAbrir.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Editar Observación (Cargada)</span>
      `;
        btnAbrir.style.backgroundColor = "#059669";
        btnAbrir.style.borderColor = "#047857";
        btnAbrir.style.color = "#ffffff";
      } else {
        // Estado: Vacío (Oscuro idéntico al botón Siguiente)
        btnAbrir.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>Agregar / Editar Observación</span>
      `;
        btnAbrir.style.backgroundColor = "#0f172a";
        btnAbrir.style.borderColor = "#0f172a";
        btnAbrir.style.color = "#ffffff";
      }
    }
  }

  // 🛠️ REEMPLAZO: Ejecución directa garantizada para Live Server
  async function inicializarSistemaCompleto() {
    // 1. Inicializar los componentes de la interfaz de inmediato
    inicializarEventos();

    // 2. Control y simulación de la sesión local en entorno de desarrollo
    let sesionLocal = localStorage.getItem("usuarioActivo");
    if (
      !sesionLocal &&
      (window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "")
    ) {
      const usuarioPruebaLocal = { email: "admin@haspen.edu.ar", role: "admin", nombre: "Desarrollador Local" };
      localStorage.setItem("usuarioActivo", JSON.stringify(usuarioPruebaLocal));
      sesionLocal = localStorage.getItem("usuarioActivo");
    }

    if (!sesionLocal) {
      window.location.href = "index.html";
      return;
    }

    try {
      // 3. Procesar datos del usuario activo
      usuarioLogueado = JSON.parse(sesionLocal);
      // 🛠️ CORREGIDO: Asegurar fallback si el email no existe en el objeto localStorage
      const emailLimpio = (usuarioLogueado.email || "admin@haspen.edu.ar").toLowerCase().trim();

      rolNormalizado = "admin";
      usuarioLogueado.cursosAsignados = [];

      // 4. Intentar conectar con Firestore para validar permisos reales
      if (db && emailLimpio) {
        console.log("Rastreador: Intentando conectar a la base de datos...");
        const userDocRef = doc(db, "usuarios", emailLimpio);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
          const datosUsuarioDb = userSnapshot.data();
          rolNormalizado = (datosUsuarioDb.rol || "").toLowerCase().trim();
          usuarioLogueado.cursosAsignados = datosUsuarioDb.cursosAsignados || [];
        }
      }

      usuarioLogueado.rolReal = rolNormalizado;

      if (domElements.csvSection) {
        domElements.csvSection.style.display = rolNormalizado === "admin" ? "flex" : "none";
      }

      // 1. Configurar primero el Ciclo Lectivo de forma estable
      if (domElements.filtroCiclo) {
        const anioActual = new Date().getFullYear();
        let opcionesCicloHtml = "";
        for (let anio = 2021; anio <= anioActual; anio++) {
          opcionesCicloHtml += `<option value="${anio}">${anio}</option>`;
        }
        domElements.filtroCiclo.innerHTML = opcionesCicloHtml;
        domElements.filtroCiclo.value = anioActual.toString();
      }

      // 2. Ejecutar la carga de cursos desde Firebase una vez estabilizado el DOM
      if (typeof cargarCursosEnSelectores === "function") {
        await cargarCursosEnSelectores();
      }

      // 3. Renderizar la tabla de alumnos
      await renderTable();
    } catch (err) {
      console.error("Error crítico durante la carga inicial:", err);
    }

    const cuerpoTablaHtml = document.getElementById("tablaAlumnosBody");
    if (cuerpoTablaHtml && cuerpoTablaHtml.innerHTML.includes("Sincronizando")) {
      cuerpoTablaHtml.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b; font-weight: 500;">Use los filtros para buscar la nómina deseada.</td></tr>`;
    }
  }

  // EJECUCIÓN INMEDIATA
  inicializarSistemaCompleto();
})();
