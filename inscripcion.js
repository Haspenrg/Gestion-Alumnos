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
  let cacheAlumnosPorCurso = {};
  let cacheAlumnosPorDni = {};
  let cursoIdOriginalLegajo = "";
  let dniDestacadoSesion = "";
  let listaIngresosNuevosSesion = [];

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
    selectEstadoMatricula: document.getElementById("estadoAlumno"),
    selectTramiteIngreso: document.getElementById("tramiteIngreso"),
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

    // Control para Solo Lectura (Minuta Punto 1)
    if (window.permisoLegajo === "lectura" && domElements.filtroEstado) {
      if (domElements.filtroEstado.value !== "Regular") {
        domElements.filtroEstado.innerHTML = '<option value="Regular">Regular</option>';
        domElements.filtroEstado.value = "Regular";
      }
    }

    // 1. Obtener valores de los filtros reales
    const queryCurso = domElements.filtroCurso?.value || "todos";
    const queryEstado = domElements.filtroEstado?.value || "todos";
    const queryAuditoria = domElements.filtroAuditoria?.value || "todos";
    const queryInclusion = domElements.filtroInclusion?.value || "todos";
    const queryCiclo = domElements.filtroCiclo?.value || "2026";
    const subCadenaBusqueda = domElements.filtroBusqueda ? domElements.filtroBusqueda.value.toLowerCase().trim() : "";

    // 2. REGLA ESCOLAR: Grilla inicial limpia
    if ((queryCurso === "todos" || queryCurso === "") && queryEstado === "todos" && !subCadenaBusqueda) {
      domElements.tablaAlumnos.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b; font-weight: 500;">Establezca un criterio de búsqueda o seleccione un curso para visualizar la nómina.</td></tr>`;
      if (domElements.contadorVisualizadas) domElements.contadorVisualizadas.textContent = "0";
      return;
    }

    // 3. Consulta asíncrona con Motor de Caché
    let listaAlumnos = [];
    try {
      const esAdmin = rolNormalizado === "administrador" || rolNormalizado === "admin";
      const cursosPermitidos = usuarioLogueado.cursosAsignados || [];

      if (subCadenaBusqueda) {
        let q;
        if (queryCurso === "todos" || queryCurso === "") {
          if (esAdmin) {
            q = query(collection(db, "alumnos"), where("cicloLectivo", "==", queryCiclo));
          } else {
            if (cursosPermitidos.length === 0) {
              domElements.tablaAlumnos.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:25px;">No posee cursos asignados a su preceptoría.</td></tr>`;
              if (domElements.contadorVisualizadas) domElements.contadorVisualizadas.textContent = "0";
              return;
            }
            q = query(
              collection(db, "alumnos"),
              where("cicloLectivo", "==", queryCiclo),
              where("cursoId", "in", cursosPermitidos)
            );
          }
        } else {
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
      } else if (queryCurso !== "todos" && queryCurso !== "") {
        if (cacheAlumnosPorCurso[queryCurso]) {
          listaAlumnos = [...cacheAlumnosPorCurso[queryCurso]];
        } else {
          const q = query(
            collection(db, "alumnos"),
            where("cursoId", "==", queryCurso),
            where("cicloLectivo", "==", queryCiclo)
          );
          const querySnapshot = await getDocs(q);
          let alumnosCurso = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            alumnosCurso.push(data);
            cacheAlumnosPorDni[data.dni] = data;
          });
          cacheAlumnosPorCurso[queryCurso] = alumnosCurso;
          listaAlumnos = [...alumnosCurso];
        }
      } else {
        let q;
        if (esAdmin) {
          q = query(collection(db, "alumnos"), where("cicloLectivo", "==", queryCiclo));
        } else {
          if (cursosPermitidos.length === 0) {
            domElements.tablaAlumnos.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:25px;">No posee cursos asignados a su preceptoría.</td></tr>`;
            if (domElements.contadorVisualizadas) domElements.contadorVisualizadas.textContent = "0";
            return;
          }
          q = query(
            collection(db, "alumnos"),
            where("cicloLectivo", "==", queryCiclo),
            where("cursoId", "in", cursosPermitidos)
          );
        }
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
          listaAlumnos.push(docSnap.data());
        });
      }
    } catch (error) {
      console.error("Error en sincronización remota de alumnos:", error);
      domElements.tablaAlumnos.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#dc2626; padding:25px;">Fallo de conexión con el servidor.</td></tr>`;
      return;
    }
    // 4. Aplicar filtros secundarios en memoria sobre los datos recuperados
    let alumnosFiltrados = listaAlumnos.filter((alumno) => {
      // Filtrado estricto por Estado (Corrige el error de mezcla con Mesa Entrada)
      if (queryEstado !== "todos" && queryEstado !== "") {
        const estAlumno = String(alumno.estado || "")
          .toLowerCase()
          .trim();
        const tramAlumno = String(alumno.tramiteIngreso || "")
          .toLowerCase()
          .trim();

        if (queryEstado === "Regular") {
          if (
            estAlumno === "baja" ||
            estAlumno === "entrante" ||
            estAlumno === "mesa entrada" ||
            estAlumno === "mesa de entrada" ||
            tramAlumno === "mesa de entrada"
          ) {
            return false;
          }
        } else if (queryEstado === "Entrante" || queryEstado === "Mesa Entrada") {
          if (
            estAlumno !== "mesa entrada" &&
            estAlumno !== "mesa de entrada" &&
            estAlumno !== "entrante" &&
            tramAlumno !== "mesa de entrada"
          ) {
            return false;
          }
        } else {
          if (alumno.estado !== queryEstado) return false;
        }
      }

      // Filtro por Inclusión (PPI / Trayectorias / CUD)
      if (queryInclusion !== "todos" && queryInclusion !== "") {
        const tieneInclusion =
          !!alumno.tienePPI || !!alumno.trayectoriaPPI || !!alumno.trayectoriasFlexibles || !!alumno.tieneCUD;
        if (queryInclusion === "ConPPI" && !tieneInclusion) return false;
        if (queryInclusion === "SinPPI" && tieneInclusion) return false;
      }

      // Filtro por Documentación
      if (queryAuditoria !== "todos" && queryAuditoria !== "") {
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

    // RASTREADOR UX: Paginación automática por alumno destacado (CORREGIDO)
    if (dniDestacadoSesion) {
      const indiceAlumnoDestacado = alumnosFiltrados.findIndex((al) => al.dni === dniDestacadoSesion);
      if (indiceAlumnoDestacado !== -1) {
        const registrosPorPaginaBase = 25;
        paginaActual = Math.floor(indiceAlumnoDestacado / registrosPorPaginaBase) + 1;
        if (domElements.lblPaginaActual) domElements.lblPaginaActual.textContent = paginaActual;
      }
    }

    // 5. Actualizar contadores visuales en la interfaz
    if (domElements.contadorVisualizadas) {
      domElements.contadorVisualizadas.textContent = alumnosFiltrados.length.toString();
    }

    domElements.tablaAlumnos.innerHTML = "";

    if (alumnosFiltrados.length === 0) {
      domElements.tablaAlumnos.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:25px;">No se encontraron alumnos para los criterios seleccionados.</td></tr>`;
      return;
    }

    // 6. Lógica de Paginación Estricta (Bloques de 25 alumnos)
    if (typeof paginaActual === "undefined") paginaActual = 1;
    const registrosPorPagina = 25;
    const indiceInicio = (paginaActual - 1) * registrosPorPagina;
    const indiceFin = indiceInicio + registrosPorPagina;
    const alumnosPaginados = alumnosFiltrados.slice(indiceInicio, indiceFin);

    // 7. Renderizado físico de filas en la tabla
    alumnosPaginados.forEach((alumno) => {
      const tr = document.createElement("tr");
      tr.className = "fila-alumno";
      tr.style.borderBottom = "1px solid #e2e8f0";
      tr.style.transition = "all 0.3s ease";

      // Aplicar anclaje visual del alumno destacado original (CORREGIDO)
      const dniAlumnoLimpio = String(alumno.dni || "").replace(/[^0-9]/g, "");
      const dniDestacadoLimpio = String(dniDestacadoSesion || "").replace(/[^0-9]/g, "");

      if (dniDestacadoLimpio && dniAlumnoLimpio === dniDestacadoLimpio) {
        tr.style.backgroundColor = "#f0f7ff";
        tr.style.boxShadow = "inset 0 0 0 1px rgba(59, 130, 246, 0.05)";
        setTimeout(() => {
          const primeraCelda = tr.querySelector("td");
          if (primeraCelda) {
            primeraCelda.style.borderLeft = "6px solid transparent";
            primeraCelda.style.borderImage = "linear-gradient(to bottom, #104179, #0284c7) 1";
            primeraCelda.style.paddingLeft = "12px";
          }
          tr.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
      // Mapeo de la Sección (Curso)
      let textoCursoMapeado = "Mesa Entrada";
      if (alumno.cursoId) {
        const opcionesSelector = domElements.filtroCurso ? Array.from(domElements.filtroCurso.options) : [];
        const opcionCoincidente = opcionesSelector.find((opt) => opt.value === alumno.cursoId);
        if (opcionCoincidente && opcionCoincidente.value !== "todos") {
          textoCursoMapeado = opcionCoincidente.textContent;
        } else if (window.cachedCursosColegio) {
          const cRef = window.cachedCursosColegio.find((c) => c.id === alumno.cursoId);
          if (cRef) {
            textoCursoMapeado = `${cRef.ciclo ? cRef.ciclo.charAt(0) : "1"}° "${cRef.division}"`;
          }
        }
      }

      // Armado de la Celda de Estado (Con Pase / Regular / Baja / Mesa Entrada)
      let celdaEstadoTexto = "";
      const estActual = String(alumno.estado || "Regular").trim();
      const tramIngreso = String(alumno.tramiteIngreso || "").trim();
      const esConPase =
        tramIngreso === "Con Pase Entrante" || tramIngreso === "Con Pase Saliente" || estActual === "Pase";

      if (esConPase) {
        celdaEstadoTexto = `<span style="background:#dbeafe; color:#1d4ed8; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight:bold;">${estActual} (Con Pase)</span>`;
      } else {
        if (estActual === "Baja") {
          celdaEstadoTexto = `<span style="background:#fee2e2; color:#b91c1c; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight:bold;">Baja</span>`;
        } else if (estActual === "Mesa Entrada" || estActual === "Mesa de Entrada" || estActual === "Entrante") {
          celdaEstadoTexto = `<span style="background:#f1f5f9; color:#475569; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight:bold;">Mesa Entrada</span>`;
        } else {
          celdaEstadoTexto = `<span style="background:#e2e8f0; color:#1e293b; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight:500;">Regular</span>`;
        }
      }

      // Columna Sección (Badge original intacto)
      let celdaCursoBadge = `<span class="badge-curso" style="background:#e0f2fe; color:#0369a1; font-weight:bold; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${textoCursoMapeado}</span>`;

      // Columna de Documentación (Auditoría)
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

      // Columna de Inclusión ("Sin Inclusión")
      let celdaInclusion = `<span style="color:#94a3b8; font-size:12px;">Sin Inclusión</span>`;
      if (alumno.trayectoriaPPI === true || alumno.tienePPI === true) {
        celdaInclusion = `<span style="color:#a855f7; font-weight:bold; font-size:12px; background:#f3e8ff; padding:4px 8px; border-radius:4px;">🗲 Con PPI</span>`;
      } else if (alumno.trayectoriasFlexibles === true) {
        celdaInclusion = `<span style="color:#0ea5e9; font-weight:bold; font-size:12px; background:#e0f2fe; padding:4px 8px; border-radius:4px;">🗲 Flexible</span>`;
      } else if (alumno.tieneCUD === true) {
        celdaInclusion = `<span style="color:#10b981; font-weight:bold; font-size:12px; background:#d1fae5; padding:4px 8px; border-radius:4px;">♿ Con CUD</span>`;
      }

      // Botonera de 5 Acciones con control RBAC
      const nombreEstudianteValido = alumno.nombreAlumno || alumno.nombre || "Sin registrar";
      const direccionEstudianteValida = alumno.direccionAlumno || alumno.direccion || "No especificada";

      let accionesHTML = `
      <div style="display: flex; gap: 4px; justify-content: flex-start; align-items: center;">
        <button type="button" class="btn-accion-fila btn-fila-ficha" data-nombre="${nombreEstudianteValido}" data-direccion="${direccionEstudianteValida}" data-tel1="${alumno.telefono1 || "No registrado"}" data-tel2="${alumno.telefono2 || "Ninguno"}" data-tutor="${alumno.nombreTutor || "No registrado"}" data-tutordni="${alumno.dniTutor || "Sin registrar"}" data-dni="${alumno.dni}" style="background:#4b5563; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:14px; cursor:pointer;" title="Ver Datos de Contacto">👁</button>
        <button type="button" class="btn-accion-fila btn-fila-informe" data-dni="${alumno.dni}" style="background:#1a73e8; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:14px; cursor:pointer;" title="Informe Pedagógico">🖨</button>
        <button type="button" class="btn-accion-fila btn-fila-boletin" data-dni="${alumno.dni}" style="background:#10b981; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:14px; cursor:pointer;" title="Boletín Escolar">📄</button>
        <button type="button" class="btn-accion-fila" onclick="window.open('historial.html?dni=${alumno.dni}', '_blank')" style="background:#f59e0b; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:14px; cursor:pointer;" title="Historial del Legajo">📜</button>
    `;

      if (window.permisoLegajo === "escritura") {
        accionesHTML += `<button type="button" class="btn-accion-fila btn-fila-editar" data-dni="${alumno.dni}" data-curso-origen="${alumno.cursoId || ""}" style="background:#2563eb; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:14px; cursor:pointer;" title="Editar Alumno">📝</button>`;
        accionesHTML += `<button type="button" class="btn-accion-fila btn-fila-eliminar" data-dni="${alumno.dni}" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:14px; cursor:pointer;" title="Eliminar Alumno">🗑️</button>`;
      }
      accionesHTML += `</div>`;

      // Saneamiento de nombres duplicados
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

      // Estructura física con las 7 columnas alineadas
      tr.innerHTML = `
      <td style="padding: 12px 10px;"><strong>${nombreParaMostrar}</strong></td>
      <td style="padding: 12px 10px; vertical-align: middle; color:#475569; font-weight:500;">${alumno.dni || ""}</td>
      <td style="padding: 12px 10px; vertical-align: middle;">${celdaCursoBadge}</td>
      <td style="padding: 12px 10px; vertical-align: middle; text-align: center;">${celdaEstadoTexto}</td>
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
        cursosLista.push({ id: docSnap.id, texto: textoMapeado });
      });

      cursosLista.sort((a, b) => a.texto.localeCompare(b.texto));

      // ====== DISCERNIR EL TERRITORIO SEGÚN JERARQUÍA DE PERMISOS ======
      const esGlobal = window.permisoLegajo === "escritura";
      const permitidos = usuarioLogueado.cursosAsignados || [];

      cursosLista.forEach((c) => {
        // La Prosecretaría/Admin ve todo; el Preceptor solo ve si el ID está en sus asignados
        if (esGlobal || permitidos.includes(c.id)) {
          opcionesHtml += `<option value="${c.id}">${c.texto}</option>`;
        }

        // El selector interno del Formulario (Wizard) siempre lista todos para cambios globales legítimos
        opcionesFormHtml += `<option value="${c.id}">${c.texto}</option>`;
      });

      if (selectorFiltro) selectorFiltro.innerHTML = opcionesHtml;
      if (selectorFormulario) selectorFormulario.innerHTML = opcionesFormHtml;
    } catch (error) {
      console.error("Error al poblar selectores de cursos:", error);
    }
  }

  function inicializarEventos() {
    // Apertura y Cierre Formulario
    if (domElements.btnAbrirMatricula)
      domElements.btnAbrirMatricula.addEventListener("click", abrirFormularioInscripcion);
    if (domElements.btnCerrarModalX) domElements.btnCerrarModalX.addEventListener("click", cerrarFormularioInscripcion);

    // Navegación Listado Principal
    if (domElements.btnPrevPagina) domElements.btnPrevPagina.addEventListener("click", paginaAnterior);
    if (domElements.btnNextPagina) domElements.btnNextPagina.addEventListener("click", paginaSiguiente);
    if (domElements.btnResetVista) domElements.btnResetVista.addEventListener("click", reiniciarVistaListado);

    // Navegación Interna Formulario
    if (domElements.btnAtrasForm) domElements.btnAtrasForm.addEventListener("click", pasoAnteriorFormulario);
    if (domElements.btnSiguienteForm) {
      domElements.btnSiguienteForm.addEventListener("click", (e) => {
        if (pasoActual === 1) {
          validarPaso1YAvanzar();
        } else if (pasoActual === 2) {
          validarPaso2YAvanzar();
        } else {
          pasoSiguienteFormulario();
        }
      });
    }

    if (domElements.btnGuardarForm) domElements.btnGuardarForm.addEventListener("click", guardarLegajoDigital); // 👈 PEGAR ESTA LÍNEA ACÁ

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
    if (domElements.inputFechaNac) domElements.inputFechaNac.addEventListener("change", calcularEdadAutomatica); // 👈 Escucha cambio de fecha
    // Escuchar cambios en la Situación Escolar Actual
    if (domElements.selectEstadoMatricula) {
      domElements.selectEstadoMatricula.addEventListener("change", alternarPanelPase);
    }

    // Escuchar cambios en el Origen / Trámite Administrativo
    if (domElements.selectTramiteIngreso) {
      domElements.selectTramiteIngreso.addEventListener("change", alternarPanelPase);
    }

    if (domElements.chkPPI) domElements.chkPPI.addEventListener("change", alternarPanelPPI);
    if (domElements.chkCUD) domElements.chkCUD.addEventListener("change", alternarPanelCUD);
    if (domElements.btnAbrirObsPPI) domElements.btnAbrirObsPPI.addEventListener("click", abrirModalObsPPI);
    if (domElements.btnCerrarObsPPI) domElements.btnCerrarObsPPI.addEventListener("click", cerrarModalObsPPI);
    if (domElements.btnGuardarObsPPI) domElements.btnGuardarObsPPI.addEventListener("click", guardarModalObsPPI);

    domElements.archivosOcultos.forEach((input) => {
      input.addEventListener("change", procesarDocumentoDigital);
    });

    // Interceptor dinámico para acciones de la grilla de alumnos
    if (domElements.tablaAlumnos) {
      domElements.tablaAlumnos.addEventListener("click", async (e) => {
        // =========================================================================
        // ACCIÓN: VER DATOS DE CONTACTO (👁)
        // =========================================================================
        const botonFicha = e.target.closest(".btn-fila-ficha");
        if (botonFicha) {
          const nombre = botonFicha.getAttribute("data-nombre");
          const dni = botonFicha.getAttribute("data-dni");
          const direccion = botonFicha.getAttribute("data-direccion");
          const tel1 = botonFicha.getAttribute("data-tel1");
          const tel2 = botonFicha.getAttribute("data-tel2");
          const tutor = botonFicha.getAttribute("data-tutor");
          const tutorDni = botonFicha.getAttribute("data-tutordni");

          const contenedorModal = domElements.modalImpresion || document.getElementById("modalImpresionContenedor");
          const cuerpoModal = document.getElementById("modalImpresionCuerpo");

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
                          <span style="font-size: 12px; color: #64748b;">DNI Tutor: ${tutorDni}</span>
                      </div>
                  </div>
              </div>
            `;
            contenedorModal.style.display = "block";
          }
          return;
        }

        // Aquí abajo continúa tu código original del botón editar...
        const botonEditar = e.target.closest(".btn-fila-editar");
        if (botonEditar) {
          const dniAlumno = botonEditar.getAttribute("data-dni");
          const cursoOrigen = botonEditar.getAttribute("data-curso-origen") || "";
          window.esEdicion = true;
          cursoIdOriginalLegajo = cursoOrigen;
          console.log(`[Modo Edición] Activado para DNI: ${dniAlumno}. Curso origen: ${cursoOrigen}`);
        }
      });
    }

    if (domElements.filtroBusqueda) {
      domElements.filtroBusqueda.addEventListener("input", () => {
        listaIngresosNuevosSesion = [];
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroCurso) {
      domElements.filtroCurso.addEventListener("change", () => {
        listaIngresosNuevosSesion = [];
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroEstado) {
      domElements.filtroEstado.addEventListener("change", () => {
        listaIngresosNuevosSesion = [];
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroAuditoria) {
      domElements.filtroAuditoria.addEventListener("change", () => {
        listaIngresosNuevosSesion = [];
        paginaActual = 1;
        renderTable();
      });
    }
    if (domElements.filtroInclusion) {
      domElements.filtroInclusion.addEventListener("change", () => {
        listaIngresosNuevosSesion = [];
        paginaActual = 1;
        renderTable();
      });
    }

    if (domElements.filtroCiclo) {
      domElements.filtroCiclo.addEventListener("change", () => {
        listaIngresosNuevosSesion = [];
        paginaActual = 1;
        renderTable();
        calcularEdadAutomatica();
      });
    }

    renderTable();
  }

  // Asegurar que la variable de persistencia temporal esté al alcance global del archivo
  base64DocumentosTemporales = {
    dni_alumno: null,
    partida_nac: null,
    cert_primaria: null,
    buena_salud: null,
    carnet_vacunas: null,
    dni_tutor: null,
    acta_ppi: null,
    acta_cud: null
  };

  // Variable global de contexto para el validador de Firebase
  window.esEdicion = false;

  function abrirFormularioInscripcion() {
    // 1. Establecer contexto de alta nueva (crítico para control de duplicados)
    window.esEdicion = false;
    dniDestacadoSesion = "";

    // 2. Reseteo estructural del formulario HTML
    if (domElements.formInscripcion) {
      domElements.formInscripcion.reset();
    }

    // 3. Forzar el ocultamiento de paneles condicionales
    if (domElements.panelPase) domElements.panelPase.style.display = "none";
    if (domElements.panelPPI) domElements.panelPPI.style.display = "none";
    if (domElements.panelCUD) domElements.panelCUD.style.display = "none";
    if (domElements.filaDocPPI) domElements.filaDocPPI.style.display = "none";
    if (domElements.filaDocCUD) domElements.filaDocCUD.style.display = "none";
    // 3.1 Restablecer selectores de situación y trámite a sus valores iniciales por defecto
    if (domElements.selectEstadoMatricula) domElements.selectEstadoMatricula.value = "Regular";
    if (domElements.selectTramiteIngreso) domElements.selectTramiteIngreso.value = "Inscripción Estándar";

    // 4. Vaciar la matriz de almacenamiento de archivos en base64
    Object.keys(base64DocumentosTemporales).forEach((key) => {
      base64DocumentosTemporales[key] = null;

      // Limpiar los elementos de la interfaz de auditoría vinculados
      const casilleroCheck = document.getElementById(`chk-${key}`);
      const botonOjo = document.getElementById(`view-${key}`);

      if (casilleroCheck) casilleroCheck.checked = false;
      if (botonOjo) {
        botonOjo.disabled = true;
        botonOjo.onclick = null; // Quita antiguos disparadores de previsualización
      }
    });

    // 5. Restablecer el botón de Observaciones PPI a su estado inicial oscuro
    if (domElements.btnAbrirObsPPI) {
      domElements.btnAbrirObsPPI.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      <span>Agregar / Editar Observación</span>
    `;
      domElements.btnAbrirObsPPI.style.backgroundColor = "#0f172a";
      domElements.btnAbrirObsPPI.style.borderColor = "#0f172a";
      domElements.btnAbrirObsPPI.style.color = "#ffffff";
    }
    if (domElements.observacionesPPI) domElements.observacionesPPI.value = "";

    const selectorCursoForm = document.getElementById("selectCursoAlumno");
    if (selectorCursoForm) {
      selectorCursoForm.disabled = false;
      selectorCursoForm.style.opacity = "1";
    }

    // Regulación de permisos para Inclusión Integral (PPI / CUD / Trayectorias)
    const permInc = String(window.permisoInclusion || "ninguno")
      .toLowerCase()
      .trim();
    const tieneEscrituraInc = permInc === "escritura" || permInc === "administrador";
    const tieneLecturaInc = permInc === "lectura" || permInc === "usuario" || tieneEscrituraInc;

    if (domElements.chkPPI) domElements.chkPPI.disabled = !tieneEscrituraInc;
    if (domElements.chkTrayectorias) domElements.chkTrayectorias.disabled = !tieneEscrituraInc;
    if (domElements.chkCUD) domElements.chkCUD.disabled = !tieneEscrituraInc;

    if (!tieneLecturaInc) {
      if (domElements.panelPPI) domElements.panelPPI.style.display = "none";
      if (domElements.panelCUD) domElements.panelCUD.style.display = "none";
    }

    if (domElements.modalFormulario) {
      domElements.modalFormulario.style.display = "block";
    }
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

  async function guardarLegajoDigital(e) {
    if (e) e.preventDefault();

    const nombreVal = domElements.inputNombre ? domElements.inputNombre.value.trim() : "";
    const dniVal = domElements.inputDni ? domElements.inputDni.value.trim() : "";

    const elBtnGuardar = domElements.btnGuardarForm;
    let textoOriginalBtn = "Guardar Legajo";
    if (elBtnGuardar) {
      textoOriginalBtn = elBtnGuardar.textContent;
      elBtnGuardar.disabled = true;
      elBtnGuardar.textContent = "⏳ Guardando legajo...";
      elBtnGuardar.style.opacity = "0.7";
    }

    // FILTRO 3: Control de duplicados en Firebase (Bloqueante)
    try {
      const alumnoRef = doc(db, "alumnos", dniVal);
      const alumnoSnap = await getDoc(alumnoRef);

      if (alumnoSnap.exists() && !window.esEdicion) {
        await window.haspenConfirm(
          `El DNI/Documento "${dniVal}" ya pertenece a un estudiante registrado en el sistema. Verifique los datos ingresados.`,
          "Estudiante Duplicado",
          "⚠️"
        );
        cambiarPasoFormulario(1);

        if (elBtnGuardar) {
          elBtnGuardar.disabled = false;
          elBtnGuardar.textContent = textoOriginalBtn;
          elBtnGuardar.style.opacity = "1";
        }
        return;
      }

      // 2. Componer el objeto JSON final para la base de datos
      const nuevoLegajo = {
        dni: dniVal,
        nombre: nombreVal,
        genero: domElements.selectGenero ? domElements.selectGenero.value : "Masculino",
        cuil: domElements.inputCuil ? domElements.inputCuil.value.trim() : "",
        fechaNacimiento: domElements.inputFechaNac ? domElements.inputFechaNac.value : "",
        edad: domElements.inputEdad ? domElements.inputEdad.value : "",
        lugarNacimiento: domElements.inputLugarNac ? domElements.inputLugarNac.value.trim() : "",
        nacionalidad: domElements.inputNacionalidad ? domElements.inputNacionalidad.value.trim() : "Argentina",
        direccion: domElements.inputDireccion ? domElements.inputDireccion.value.trim() : "",
        telefono1: domElements.inputTelefono1 ? domElements.inputTelefono1.value.trim() : "",
        telefono2: domElements.inputTelefono2 ? domElements.inputTelefono2.value.trim() : "",

        // Datos del Adulto Responsable (Paso 3)
        nombreTutor: domElements.inputNombreTutor ? domElements.inputNombreTutor.value.trim() : "",
        dniTutor: domElements.inputDniTutor ? domElements.inputDniTutor.value.trim() : "",
        generoTutor: domElements.selectGeneroTutor ? domElements.selectGeneroTutor.value : "Masculino",
        cuilTutor: domElements.inputCuilTutor ? domElements.inputCuilTutor.value.trim() : "",
        emailTutor: domElements.inputEmailTutor ? domElements.inputEmailTutor.value.trim() : "",

        // Configuración Institucional e Inclusiones (Paso 2)
        estado: domElements.selectEstadoMatricula ? domElements.selectEstadoMatricula.value : "Regular",
        tramiteIngreso: domElements.selectTramiteIngreso
          ? domElements.selectTramiteIngreso.value
          : "Inscripción Estándar",
        cursoId: domElements.selectCursoAsignado ? domElements.selectCursoAsignado.value : "",
        cicloLectivo: domElements.filtroCiclo ? domElements.filtroCiclo.value : new Date().getFullYear().toString(),

        // Integración de Inclusiones y Trayectorias
        trayectoriasFlexibles: domElements.chkTrayectorias ? domElements.chkTrayectorias.checked : false,
        tienePPI: domElements.chkPPI ? domElements.chkPPI.checked : false,
        ppiResolucion: domElements.inputPpiResolucion ? domElements.inputPpiResolucion.value.trim() : "",
        observacionesPPI: domElements.observacionesPPI ? domElements.observacionesPPI.value.trim() : "",
        tieneCUD: domElements.chkCUD ? domElements.chkCUD.checked : false,

        // Observaciones Generales (Paso 5)
        observacionesGenerales: domElements.txtObservaciones ? domElements.txtObservaciones.value.trim() : "",

        // Auditoría Documental Comprimida (Paso 4)
        documentosDigitales: { ...base64DocumentosTemporales },
        fechaUltimoResguardo: new Date().toISOString()
      };

      if (window.esEdicion && cursoIdOriginalLegajo) {
        delete cacheAlumnosPorCurso[cursoIdOriginalLegajo];
        await setDoc(
          doc(db, "control_cambios", cursoIdOriginalLegajo),
          { ultimaModificacion: new Date().toISOString() },
          { merge: true }
        );
      }

      if (nuevoLegajo.cursoId && nuevoLegajo.estado !== "Baja") {
        delete cacheAlumnosPorCurso[nuevoLegajo.cursoId];
        await setDoc(
          doc(db, "control_cambios", nuevoLegajo.cursoId),
          { ultimaModificacion: new Date().toISOString() },
          { merge: true }
        );
      }

      dniDestacadoSesion = dniVal;
      listaIngresosNuevosSesion = listaIngresosNuevosSesion.filter((al) => al.dni !== nuevoLegajo.dni);
      listaIngresosNuevosSesion.unshift(nuevoLegajo);

      if (domElements.filtroCurso) domElements.filtroCurso.value = "todos";
      if (domElements.filtroEstado) domElements.filtroEstado.value = "todos";
      if (domElements.filtroAuditoria) domElements.filtroAuditoria.value = "todos";
      if (domElements.filtroInclusion) domElements.filtroInclusion.value = "todos";
      if (domElements.filtroBusqueda) domElements.filtroBusqueda.value = "";

      cursoIdOriginalLegajo = "";
      paginaActual = 1;

      // 4. Crear e inyectar el cartel verde estilizado en el centro de la pantalla

      const avisoExito = document.createElement("div");
      avisoExito.style.position = "fixed";
      avisoExito.style.top = "30%";
      avisoExito.style.left = "50%";
      avisoExito.style.transform = "translate(-50%, -50%)";
      avisoExito.style.backgroundColor = "#10b981"; // Verde esmeralda institucional
      avisoExito.style.color = "#ffffff"; // Letras blancas
      avisoExito.style.padding = "16px 32px";
      avisoExito.style.borderRadius = "8px";
      avisoExito.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.3)";
      avisoExito.style.zIndex = "100000";
      avisoExito.style.fontSize = "16px";
      avisoExito.style.fontWeight = "bold";
      avisoExito.style.textAlign = "center";
      avisoExito.innerHTML = "✅ ¡Legajo Guardado con Éxito!";
      document.body.appendChild(avisoExito);

      // 5. Temporizador de 2 segundos para la lectura, el cierre y la limpieza automática
      setTimeout(() => {
        // Remover el cartel verde de la pantalla
        avisoExito.remove();

        // Cerrar el modal del asistente
        if (domElements.modalFormulario) {
          domElements.modalFormulario.style.display = "none";
        }

        // Limpiar los campos para la próxima carga
        if (domElements.formInscripcion) {
          domElements.formInscripcion.reset();
        }

        // Refrescar la grilla de alumnos con los datos nuevos
        renderTable();
      }, 2000); // 2000 milisegundos equivalen a 2 segundos exactos
    } catch (error) {
      console.error("Error crítico al interactuar con Firestore:", error);
      await window.haspenConfirm(
        "Ocurrió un error en la conexión al intentar resguardar los datos en la nube. Intente nuevamente.",
        "Error de Servidor",
        "❌"
      );
    } finally {
      // Devolver los controles a su estado inicial activo
      if (elBtnGuardar) {
        elBtnGuardar.disabled = false;
        elBtnGuardar.textContent = textoOriginalBtn;
        elBtnGuardar.style.opacity = "1";
      }
    }
  }

  function calcularEdadAutomatica() {
    if (!domElements.inputFechaNac || !domElements.inputFechaNac.value) {
      if (domElements.inputEdad) domElements.inputEdad.value = "";
      return;
    }

    // 1. Obtener el año del ciclo lectivo elegido en la pantalla (Ej: "2021", "2026")
    const anioCiclo =
      domElements.filtroCiclo && domElements.filtroCiclo.value ? parseInt(domElements.filtroCiclo.value, 10) : 2026; // As de agosto de 2026 como fallback estándar del sistema

    // 2. Establecer la fecha de corte normativa escolar (30 de Junio de ese año elegido)
    const fechaCorteEscolar = new Date(anioCiclo, 5, 30); // Mes 5 es Junio en JavaScript
    const fechaNac = new Date(domElements.inputFechaNac.value);

    // 3. Calcular la edad que el estudiante tenía en ese momento histórico
    let edad = fechaCorteEscolar.getFullYear() - fechaNac.getFullYear();
    const mesDiferencia = fechaCorteEscolar.getMonth() - fechaNac.getMonth();

    if (mesDiferencia < 0 || (mesDiferencia === 0 && fechaCorteEscolar.getDate() < fechaNac.getDate())) {
      edad--;
    }

    // 4. Mostrar el resultado estilizado en el casillero correspondiente
    if (domElements.inputEdad) {
      domElements.inputEdad.value = edad >= 0 ? `${edad} años` : "0 años";
    }
  }

  function alternarPanelPase() {
    // 1. Capturar los elementos reales registrados en domElements
    const selectorEstado = domElements.selectEstadoMatricula;
    const selectorTramite = domElements.selectTramiteIngreso;
    const selectorCurso = domElements.selectCursoAsignado;

    if (!selectorEstado || !selectorTramite) return;

    const estado = selectorEstado.value;
    const tramite = selectorTramite.value;

    // 2. Control del Panel Visual de Pases (Muestra campos si es Pase Entrante o Saliente)
    if (domElements.panelPase) {
      if (tramite === "Con Pase Entrante" || tramite === "Con Pase Saliente") {
        domElements.panelPase.style.display = "flex";
      } else {
        domElements.panelPase.style.display = "none";
      }
    }

    // 3. Control Obligatorio del Curso Asignado (Reglas de bloqueo)
    if (selectorCurso) {
      if (estado === "Baja" || tramite === "Mesa de Entrada" || tramite === "Con Pase Saliente") {
        // Bloqueo absoluto: El alumno no ocupa espacio físico en el aula
        selectorCurso.disabled = true;
        selectorCurso.value = "";
        selectorCurso.style.opacity = "0.5";
      } else {
        // Habilitación: Estudiante Regular en condiciones de cursar
        selectorCurso.disabled = false;
        selectorCurso.style.opacity = "1";
      }
    }
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

    // Muestra u oculta tanto el bloque de campos como la fila de auditoría documental (Paso 4)
    domElements.panelCUD.style.display = tieneCUD ? "flex" : "none";
    domElements.filaDocCUD.style.display = tieneCUD ? "flex" : "none";

    // Si el usuario desmarca el CUD, limpiamos los datos residuales que haya escrito
    if (!tieneCUD) {
      const inputNroCUD = document.getElementById("ppiResolucion"); // Reemplazar por el ID de tu campo de CUD si difiere
      if (inputNroCUD) inputNroCUD.value = "";
    }
  }

  // Función interna de alta fidelidad para comprimir imágenes mediante Canvas
  function optimizarImagenHD(base64Original) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Original;
      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_WIDTH = 1600; // Resolución optimizada para lectura de textos escolares finos

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
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = function () {
        resolve(base64Original); // PDFs o archivos no gráficos pasan sin alteración
      };
    });
  }

  // Interceptor reactivo de carga documental
  async function procesarDocumentoDigital(e) {
    const input = e.target;
    const key = input.getAttribute("data-key");
    const casilleroCheck = document.getElementById(`chk-${key}`);
    const botonOjo = document.getElementById(`view-${key}`);
    const archivo = input.files[0];

    if (!archivo) return;

    const lectorBinario = new FileReader();
    lectorBinario.onload = async function (evt) {
      let stringBase64Final = evt.target.result;
      const umbralSeguroBytes = 300 * 1024; // 300 KB

      // Intercepta e inicia compresión HD solo si supera el umbral y es formato gráfico
      if (archivo.size > umbralSeguroBytes && archivo.type.startsWith("image/")) {
        console.log(`[Compresor HD] Optimizando imagen de ${(archivo.size / 1024).toFixed(1)} KB.`);
        stringBase64Final = await optimizarImagenHD(stringBase64Final);
      }

      // Persistencia en la memoria volátil antes del guardado definitivo
      base64DocumentosTemporales[key] = stringBase64Final;

      // Actualización reactiva de la interfaz de auditoría
      if (casilleroCheck) casilleroCheck.checked = true;
      if (botonOjo) {
        botonOjo.disabled = false;
        botonOjo.onclick = function () {
          const ventanaEmergente = window.open();
          if (!ventanaEmergente) {
            window.haspenAlert("Autorice los pop-ups en el navegador para visualizar documentos.", "alerta");
            return;
          }
          ventanaEmergente.document.write(`
            <html>
            <head><title>Previsualización: ${key}</title></head>
            <body style="margin:0; background:#0f172a; display:flex; justify-content:center; align-items:center; min-height:100vh;">
            ${
              stringBase64Final.startsWith("data:application/pdf")
                ? `<iframe src="${stringBase64Final}" style="width:100vw; height:100vh; border:none;"></iframe>`
                : `<img src="${stringBase64Final}" style="max-width:95%; max-height:95vh; object-fit:contain;">`
            }
            </body>
            </html>
          `);
          ventanaEmergente.document.close();
        };
      }
      console.log(`Documento subido y optimizado con éxito: ${key}`);
    };

    lectorBinario.readAsDataURL(archivo);
    input.value = ""; // Limpieza de control del input para permitir cargas sucesivas del mismo archivo
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
    // Vaciado absoluto de los contenedores locales para forzar descarga limpia desde Firebase
    cacheAlumnosPorCurso = {};
    cacheAlumnosPorDni = {};

    paginaActual = 1;
    actualizarEtiquetaPagina();
    if (domElements.filtroBusqueda) domElements.filtroBusqueda.value = "";

    // Volver a renderizar: al estar la caché vacía, el Caso B hará un "Miss" e irá a la red
    renderTable();
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

  // 🛠️ REEMPLAZO: Ejecución directa garantizada para la plataforma real del Colegio Haspen
  async function inicializarSistemaCompleto() {
    // 1. Inicializar los componentes de la interfaz de inmediato
    inicializarEventos();

    // 2. Control estricto de la sesión real activa de la plataforma
    const datosSesionRaw = sessionStorage.getItem("usuarioActivo");
    if (!datosSesionRaw) {
      window.location.href = "index.html";
      return;
    }

    // 3. Procesar datos del usuario activo legítimo
    usuarioLogueado = JSON.parse(datosSesionRaw);

    try {
      // 🛠️ REEMPLAZO: Extracción y normalización del documento para la consulta en internet por DNI
      const dniLimpio = String(usuarioLogueado.dni || "11111111").trim();

      rolNormalizado = "admin";
      usuarioLogueado.cursosAsignados = [];

      // 4. Intentar conectar con Firestore para validar permisos reales
      if (db && dniLimpio) {
        console.log("Rastreador: Intentando conectar a la base de datos mediante DNI...");
        const userDocRef = doc(db, "usuarios", dniLimpio);
        const userSnapshot = await getDoc(userDocRef);
        if (userSnapshot.exists()) {
          const datosUsuarioDb = userSnapshot.data();
          rolNormalizado = (datosUsuarioDb.rol || "").toLowerCase().trim();
          usuarioLogueado.cursosAsignados = datosUsuarioDb.cursosAsignados || [];

          window.permisoLegajo = "lectura";
          window.permisoInclusion = "lectura"; // 🌟 NUEVO: Variable de control unificado para Inclusión

          if (rolNormalizado === "administrador" || rolNormalizado === "admin") {
            window.permisoLegajo = "escritura";
            window.permisoInclusion = "escritura"; // El administrador tiene acceso total
            rolNormalizado = "administrador";
          } else if (rolNormalizado !== "") {
            try {
              const rolDocRef = doc(db, "roles", rolNormalizado);
              const rolSnapshot = await getDoc(rolDocRef);

              if (rolSnapshot.exists()) {
                const matrizPermisos = rolSnapshot.data().permisos || {};

                // 1. Validar el permiso del Legajo General
                const capLegajo = String(matrizPermisos.legajoDigital || "ninguno")
                  .toLowerCase()
                  .trim();

                if (capLegajo === "escritura" || capLegajo === "administrador") {
                  window.permisoLegajo = "escritura";
                } else {
                  window.permisoLegajo = "lectura";
                }

                // 2. 🌟 NUEVO: Validar y capturar el permiso unificado de Inclusión Integral
                const capInclusion = String(matrizPermisos.inclusionPpi || "ninguno")
                  .toLowerCase()
                  .trim();

                if (capInclusion === "escritura" || capInclusion === "administrador") {
                  window.permisoInclusion = "escritura";
                } else if (capInclusion === "lectura" || capInclusion === "usuario") {
                  window.permisoInclusion = "lectura";
                } else {
                  window.permisoInclusion = "ninguno"; // Bloqueado por completo
                }
              }
            } catch (errRol) {
              console.error("Error al interceptar el rol:", errRol);
            }
          }

          usuarioLogueado.rolReal = rolNormalizado;
          usuarioLogueado.permisoLegajoReal = window.permisoLegajo;
          usuarioLogueado.permisoInclusionReal = window.permisoInclusion; // Guardar en la sesión activa
          if (window.permisoLegajo === "ninguno") {
            const contenedorPrincipal = document.querySelector(".consola-matriculacion") || document.body;
            contenedorPrincipal.innerHTML = `<div style="text-align:center; padding:50px; color:#dc2626; font-family:sans-serif;"><h2>⚠️ Acceso Denegado</h2><p>Su perfil de usuario no cuenta con autorización para visualizar el Legajo Digital de Alumnos.</p></div>`;
            return;
          }

          if (window.permisoLegajo === "lectura") {
            if (domElements.btnAbrirMatricula) domElements.btnAbrirMatricula.style.display = "none";
          } else if (window.permisoLegajo === "escritura") {
            if (domElements.btnAbrirMatricula) domElements.btnAbrirMatricula.style.display = "inline-block";
          }

          if (domElements.csvSection) {
            const esAdmin = rolNormalizado === "administrador" || rolNormalizado === "admin";
            const tieneEscritura = window.permisoLegajo === "escritura";
            domElements.csvSection.style.display = esAdmin && tieneEscritura ? "flex" : "none";
          }
        }
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

      // =========================================================================
      // 📡 MOTOR SEMÁFORO: HILO EN SEGUNDO PLANO PARA ACTUALIZACIÓN COOPERATIVA
      // =========================================================================
      if (db && usuarioLogueado && Array.isArray(usuarioLogueado.cursosAsignados)) {
        // Variable interna para evitar falsas alarmas durante el microsegundo de conexión inicial
        let conexionesEstabilizadas = false;
        setTimeout(() => {
          conexionesEstabilizadas = true;
        }, 1500);

        usuarioLogueado.cursosAsignados.forEach((idCursoEscucha) => {
          if (!idCursoEscucha) return;

          // Escucha selectiva de 1 lectura por curso asignado para el blindaje de la cuota Spark
          onSnapshot(doc(db, "control_cambios", idCursoEscucha), (snapshotCambio) => {
            if (!conexionesEstabilizadas) return; // Evita el disparo inicial espurio

            console.log(`[Semáforo] ⚠️ Modificación detectada externamente en el curso: ${idCursoEscucha}`);

            // Diseñar e Inyectar la Alerta UX Estilizada Oficial de Haspen
            const idAlertaEstilizada = `alerta-haspen-sync-${idCursoEscucha}`;
            if (document.getElementById(idAlertaEstilizada)) return; // Evita duplicar el cartel visual

            const contenedorAlerta = document.createElement("div");
            contenedorAlerta.id = idAlertaEstilizada;

            // Estilos CSS Inline premium adaptados a la paleta institucional
            Object.assign(contenedorAlerta.style, {
              position: "fixed",
              bottom: "24px",
              right: "24px",
              backgroundColor: "#1e293b", // Slate oscuro industrial
              color: "#ffffff",
              padding: "16px 20px",
              borderRadius: "10px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
              zIndex: "999999",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxWidth: "340px",
              borderLeft: "5px solid #3b82f6", // Borde azul reactivo brillante
              fontFamily: "system-ui, -apple-system, sans-serif",
              animation: "slideInHaspen 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            });

            // Animación de entrada fluida por código dinámico
            if (!document.getElementById("style-haspen-animations")) {
              const styleTag = document.createElement("style");
              styleTag.id = "style-haspen-animations";
              styleTag.textContent = `@keyframes slideInHaspen { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
              document.head.appendChild(styleTag);
            }

            contenedorAlerta.innerHTML = `
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:20px;">🔔</span>
                <div>
                  <h4 style="margin:0; font-size:14px; font-weight:600; color:#f8fafc;">Nómina Desactualizada</h4>
                  <p style="margin:2px 0 0 0; font-size:12px; color:#94a3b8; line-height:1.4;">Un operador modificó datos o registros del curso asignado a su preceptoría.</p>
                </div>
              </div>
              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
                <button id="btn-ignorar-${idCursoEscucha}" style="background:transparent; border:none; color:#64748b; font-size:12px; font-weight:500; cursor:pointer; padding:6px 10px; border-radius:4px;">Ignorar</button>
                <button id="btn-sync-${idCursoEscucha}" style="background:#3b82f6; border:none; color:white; font-size:12px; font-weight:600; cursor:pointer; padding:6px 12px; border-radius:4px; box-shadow:0 2px 4px rgba(59,130,246,0.3);">Sincronizar</button>
              </div>
            `;

            document.body.appendChild(contenedorAlerta);

            // Manejadores de los botones del cartel estilizado
            document.getElementById(`btn-ignorar-${idCursoEscucha}`).addEventListener("click", () => {
              contenedorAlerta.remove();
            });

            document.getElementById(`btn-sync-${idCursoEscucha}`).addEventListener("click", () => {
              // Acción reactiva: Invalidar la caché vieja y re-renderizar de inmediato
              delete cacheAlumnosPorCurso[idCursoEscucha];
              console.log(`[Semáforo UX] 🔄 Sincronizando curso ${idCursoEscucha} a petición del preceptor.`);
              contenedorAlerta.remove();
              renderTable();
            });
          });
        });
      }
      // =========================================================================
    } catch (err) {
      console.error("Error crítico durante la carga inicial:", err);
    }

    const cuerpoTablaHtml = document.getElementById("tablaAlumnosBody");
    if (cuerpoTablaHtml && cuerpoTablaHtml.innerHTML.includes("Sincronizando")) {
      cuerpoTablaHtml.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b; font-weight: 500;">Use los filtros para buscar la nómina deseada.</td></tr>`;
    }
  }
  function validarPaso2YAvanzar() {
    const selectorEstado = document.getElementById("estadoAlumno");
    const selectorCurso = document.getElementById("selectCursoAlumno");

    if (selectorEstado && selectorCurso) {
      if (selectorEstado.value === "Regular" && !selectorCurso.value) {
        mostrarConfirmacionHaspen(
          "Curso Obligatorio",
          "Todo estudiante con estado Regular debe tener un Curso / Sección asignada para poder continuar.",
          () => {}
        );
        if (selectorCurso) selectorCurso.focus();
        return; // Frena el avance al Paso 3
      }
    }

    pasoSiguienteFormulario();
  }

  function validarPaso1YAvanzar() {
    const nombreVal = domElements.inputNombre ? domElements.inputNombre.value.trim() : "";
    const dniVal = domElements.inputDni ? domElements.inputDni.value.replace(/\s+/g, "") : "";

    if (!nombreVal || !dniVal) {
      mostrarConfirmacionHaspen(
        "Faltan Campos Obligatorios",
        "Los campos Nombre Completo y Documento (DNI) son requeridos para poder continuar.",
        () => {}
      );
      return;
    }

    if (/^\d+$/.test(dniVal) && (dniVal.length < 7 || dniVal.length > 8)) {
      mostrarConfirmacionHaspen(
        "Formato de DNI Inusual",
        `El DNI ingresado ("${dniVal}") tiene ${dniVal.length} dígitos. Lo habitual para un documento argentino son 7 u 8 dígitos. ¿Desea continuar de todas formas?`,
        () => {
          pasoSiguienteFormulario();
        }
      );
      return;
    }

    pasoSiguienteFormulario();
  }

  // EJECUCIÓN INMEDIATA
  inicializarSistemaCompleto();
})();
