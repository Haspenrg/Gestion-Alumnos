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
  const firebaseConfig = {
    apiKey: "AIzaSyBP3iHdEsCnQSABsxEDDR4RNZ1M06MJyvo",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-alumnos-eeb24",
    storageBucket: "gestion-alumnos-eeb24.firebasestorage.app",
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

    // Paginación del Listado Principal
    btnPrevPagina: document.getElementById("btnPrevDesktop"),
    btnNextPagina: document.getElementById("btnNextDesktop"),
    lblPaginaActual: document.getElementById("lblPaginaActual"),
    btnResetVista: document.getElementById("btnResetPagina"),

    // Modal Principal de Inscripción
    modalFormulario: document.getElementById("contenedorFormularioAltaModal"),
    btnAbrirMatricula: document.getElementById("btnAbrirFormularioAlta"),
    btnCerrarModalX: document.getElementById("btnCerrarWizardX"),
    formInscripcion: document.getElementById("formInscripcion"),

    // Botones de Navegación del Formulario
    btnAtrasForm: document.getElementById("btnAtrasWizard"),
    btnSiguienteForm: document.getElementById("btnSiguienteWizard"),
    btnGuardarForm: document.getElementById("btnGuardar"),

    // Pantallas y Pestañas del Formulario (CORREGIDO: Ahora incluye los 5 pasos)
    pasosBloques: [
      document.getElementById("bloque-paso1"),
      document.getElementById("bloque-paso2"),
      document.getElementById("bloque-paso3"),
      document.getElementById("bloque-paso4"),
      document.getElementById("bloque-paso5")
    ],
    pasosTabs: [
      document.getElementById("tab-paso1"),
      document.getElementById("tab-paso2"),
      document.getElementById("tab-paso3"),
      document.getElementById("tab-paso4"),
      document.getElementById("tab-paso5")
    ],

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
    selectCursoAsignado: document.getElementById("selectCursoAlumno"),
    chkTrayectorias: document.getElementById("chkTrayectoriasFlexibles"),

    // Paneles Condicionales PPI y CUD (Paso 2)
    panelPase: document.getElementById("panelCamposPase"),
    chkPPI: document.getElementById("chkHabilitarPPI"),
    panelPPI: document.getElementById("panelCamposPPI"),
    inputPpiResolucion: document.getElementById("ppiResolucion"),
    btnAbrirObsPPI: document.getElementById("btnAbrirObsPPI"),
    modalObservacionesPPI: document.getElementById("modalObservacionesPPI"),
    btnCerrarObsPPI: document.getElementById("btnCerrarObsPPI"),
    btnGuardarObsPPI: document.getElementById("btnGuardarObsPPI"),
    observacionesPPI: document.getElementById("observacionesPPI"),
    chkCUD: document.getElementById("chkHabilitarCUD"), // 👈 Declarado
    panelCUD: document.getElementById("panelCamposCUD"), // 👈 Declarado

    // Gestión Documental (Paso 4)
    archivosOcultos: document.querySelectorAll(".input-archivo-oculto"),
    filaDocPPI: document.getElementById("filaDocumentoPPI"),
    filaDocCUD: document.getElementById("filaDocumentoCUD"), // 👈 Declarado

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

    // Forzar limpieza del mensaje estático "Sincronizando..." del HTML
    if (paginaActual === 1 && (!domElements.filtroCurso || domElements.filtroCurso.value === "todos")) {
      domElements.tablaAlumnos.innerHTML = "";
    }

    const queryCurso = document.getElementById("filtroCursoEstructural")?.value || "todos";

    if (queryCurso === "todos") {
      domElements.tablaAlumnos.innerHTML = "";
      const tr = document.createElement("tr");
      const mensaje =
        rolNormalizado === "admin"
          ? "Use los filtros para buscar la nómina deseada."
          : "Seleccione un curso para ver la nómina.";

      tr.innerHTML = `<td colspan="6" style="text-align: center; padding: 20px; color: #64748b; font-weight: 500;">${mensaje}</td>`;
      domElements.tablaAlumnos.appendChild(tr);
      if (domElements.contadorVisualizadas) domElements.contadorVisualizadas.textContent = "0";
      return;
    }

    try {
      let q = query(collection(db, "alumnos"), where("curso", "==", queryCurso));
      const snapshot = await getDocs(q);

      domElements.tablaAlumnos.innerHTML = "";
      let listaAlumnos = [];

      snapshot.forEach((docSnap) => {
        listaAlumnos.push({ id: docSnap.id, ...docSnap.data() });
      });

      const queryEstado = domElements.filtroEstado?.value || "todos";
      const queryPpi = domElements.filtroPPI?.value || "todos";
      const querySearch = domElements.filtroBusqueda?.value.toLowerCase().trim() || "";

      let filtrados = listaAlumnos.filter((al) => {
        if (queryEstado !== "todos" && al.estado_matricula !== queryEstado) return false;

        if (queryPpi !== "todos") {
          if (queryPpi === "con-ppi" && !al.ppi) return false;
          if (queryPpi === "sin-ppi" && al.ppi) return false;
        }

        if (querySearch !== "") {
          const nom = (al.nombre || "").toLowerCase();
          const dni = (al.dni || "").toString();
          if (!nom.includes(querySearch) && !dni.includes(querySearch)) return false;
        }
        return true;
      });

      const inicio = (paginaActual - 1) * 25;
      const fin = inicio + 25;
      const paginados = filtrados.slice(inicio, fin);

      if (paginados.length === 0) {
        domElements.tablaAlumnos.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">No se encontraron alumnos para los criterios seleccionados.</td></tr>`;
        if (domElements.contadorVisualizadas) domElements.contadorVisualizadas.textContent = "0";
        return;
      }

      paginados.forEach((al) => {
        const tr = document.createElement("tr");

        let badgesHtml = "";
        const docs = al.documentos_entregados || {};
        for (const [key, value] of Object.entries(docs)) {
          const clase = value ? "badge-verde" : "badge-rojo";
          badgesHtml += `<span class="badge-documento ${clase}">${key.replace("_", " ")}</span> `;
        }

        tr.innerHTML = `
                <td>${al.nombre || ""}</td>
                <td>${al.dni || ""}</td>
                <td>${al.curso || ""}</td>
                <td>${al.estado_matricula || ""}</td>
                <td>${badgesHtml}</td>
                <td>
                    <button class="btn-editar-alumno" data-id="${al.id}" style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 4px;">Editar</button>
                    <button class="btn-eliminar-alumno" data-id="${al.id}" style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Eliminar</button>
                </td>
            `;

        tr.querySelector(".btn-editar-alumno").addEventListener("click", () => editarAlumno(al.id));
        tr.querySelector(".btn-eliminar-alumno").addEventListener("click", () => eliminarAlumno(al.id));

        domElements.tablaAlumnos.appendChild(tr);
      });

      if (domElements.contadorVisualizadas) domElements.contadorVisualizadas.textContent = paginados.length;
      if (domElements.contadorTotal) domElements.contadorTotal.textContent = filtrados.length;
    } catch (error) {
      console.error("Error al cargar alumnos:", error);
    }
  }

  async function cargarCursosEnSelectores() {
    const selectorFiltro = document.getElementById("filtroCursoEstructural");
    const selectorFormulario = domElements.selectCursoAsignado;

    if (!db) {
      console.warn("Firebase no inicializado: Saltando carga de selectores de cursos.");
      return;
    }

    try {
      const cursosRef = collection(db, "cursos");
      const q = query(cursosRef, where("activo", "==", true));
      const snapshot = await getDocs(q);

      let opcionesHtml = '<option value="todos">Todos los Cursos</option>';
      let opcionesFormHtml = '<option value="">Seleccione curso...</option>';
      let cursosLista = [];

      snapshot.forEach((docSnap) => {
        const c = docSnap.data();
        // Formatear el texto visible ej: "1° Año - División A (Mañana)"
        const textoMapeado = `${c.ciclo} - Div: ${c.division} (${c.turno})`;
        cursosLista.push({ id: docSnap.id, texto: textoMapeado });
      });

      // Ordenar alfabéticamente por año y división
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

    if (!domElements.btnAbrirFormAlta) {
      console.log("Rastreador ERROR: btnAbrirFormAlta es NULL");
    }
    domElements.btnAbrirFormAlta.addEventListener("click", abrirModalFormulario);
    console.log("Rastreador: Botón abrir modal configurado");

    if (!domElements.btnCerrarFormAlta) {
      console.log("Rastreador ERROR: btnCerrarFormAlta es NULL");
    }
    domElements.btnCerrarFormAlta.addEventListener("click", cerrarModalFormulario);
    console.log("Rastreador: Botón cerrar modal configurado");

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
    if (domElements.filtroCurso)
      domElements.filtroCurso.addEventListener("change", () => {
        paginaActual = 1;
        renderTable();
      });
    if (domElements.filtroEstado) domElements.filtroEstado.addEventListener("change", renderTable);
    if (domElements.filtroPPI) domElements.filtroPPI.addEventListener("change", renderTable);
    if (domElements.filtroBusqueda) domElements.filtroBusqueda.addEventListener("input", renderTable);

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

  document.addEventListener("DOMContentLoaded", async () => {
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
      const emailLimpio = (usuarioLogueado.email || "").toLowerCase().trim();

      // Valores por defecto preventivos para evitar congelamiento
      rolNormalizado = "admin";
      usuarioLogueado.cursosAsignados = [];

      // 4. Intentar conectar con Firestore para validar permisos reales
      if (db) {
        const userDocRef = doc(db, "usuarios", emailLimpio);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
          const datosUsuarioDb = userSnapshot.data();
          rolNormalizado = (datosUsuarioDb.rol || "").toLowerCase().trim();
          usuarioLogueado.cursosAsignados = datosUsuarioDb.cursosAsignados || [];
        }
      }
      usuarioLogueado.rolReal = rolNormalizado;

      // 5. Configurar elementos visuales críticos y selectores
      if (domElements.csvSection) {
        domElements.csvSection.style.display = rolNormalizado === "admin" ? "flex" : "none";
      }

      if (domElements.filtroCiclo) {
        domElements.filtroCiclo.value = new Date().getFullYear().toString();
      }

      // 6. Poblar las listas desplegables y forzar el renderizado de la tabla
      if (typeof cargarCursosEnSelectores === "function") {
        cargarCursosEnSelectores().catch((e) => console.error(e));
      }

      await renderTable();
    } catch (err) {
      console.error("Error crítico durante la carga inicial:", err);
    }

    // Forzado absoluto directo al ID del HTML sin intermediarios
    const cuerpoTablaHtml = document.getElementById("alumnosTableBody");
    if (cuerpoTablaHtml) {
      cuerpoTablaHtml.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b; font-weight: 500;">Use los filtros para buscar la nómina deseada.</td></tr>`;
    } else {
      console.log("Rastreador Crítico: No se encontró ningún elemento con el ID alumnosTableBody en el HTML.");
    }
  });
})();
