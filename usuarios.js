(async function () {
  "use strict";

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
  const { db } = await import("./firebase-config.js");
  const { collection, getDocs, setDoc, doc, deleteDoc, getDoc } = await import(b + "firebase-firestore.js");
  const mAuth = await import(b + "firebase-auth.js");
  const mApp = await import(b + "firebase-app.js");

  // Instancia secundaria aislada para registrar credenciales sin desloguear al Admin
  const firebaseConfigSecondary = {
    apiKey: "AIzaSyBP3iHdEsCnQSABsxEDDR4RNZ1M06MJyvo",
    authDomain: "gestion-alumnos-eeb24" + "." + "firebaseapp" + "." + "com",
    projectId: "gestion-alumnos-eeb24",
    storageBucket: "gestion-alumnos-eeb24.firebasestorage.app",
    messagingSenderId: "824391106851",
    appId: "1:824391106851:web:d8fdc7f37351bedc034c96"
  };

  const secondaryApp = mApp.initializeApp(firebaseConfigSecondary, "SecondaryAuthApp");
  const secondaryAuth = mAuth.getAuth(secondaryApp);

  let catedrasTemporales = [];
  let paginaActual = 1;
  const usuariosPorPagina = 10;

  // Elementos de control de la interfaz
  const formUsuario = document.getElementById("formUsuario");
  const nombreApellido = document.getElementById("nombreApellido");
  const dniUsuario = document.getElementById("dniUsuario");
  const emailUsuario = document.getElementById("emailUsuario");
  const rolUsuario = document.getElementById("rolUsuario");
  const checkGestionPeriodos = document.getElementById("checkGestionPeriodos");
  const checkEsProfesor = document.getElementById("checkEsProfesor");
  const dniOriginalEdicion = document.getElementById("dniOriginalEdicion");
  const formTitulo = document.getElementById("formTitulo");
  const bannerEdicion = document.getElementById("bannerEdicion");
  const btnCancelarEdicion = document.getElementById("btnCancelarEdicion");
  const tbody = document.getElementById("tablaUsuariosBody");
  const selectRol = document.getElementById("rolUsuario");
  const checkProfesor = document.getElementById("checkEsProfesor");
  const selectAnioProfesor = document.getElementById("anioProfesor");
  const btnAgregarCatedra = document.getElementById("btnAgregarCatedra");
  const filtroBusqueda = document.getElementById("filtroBusquedaRapida");
  const filtroRolBase = document.getElementById("filtroRolBase");
  const filtroCursoDivision = document.getElementById("filtroCursoDivision");

  // Referencias del DOM vinculadas a los nuevos campos de contraseña
  const claveUsuario = document.getElementById("claveUsuario");
  const confirmarClaveUsuario = document.getElementById("confirmarClaveUsuario");

  // --- COMPONENTE DE NOTIFICACIONES FLOTANTES INSTITUCIONALES (ALTO IMPACTO VISUAL) ---
  function mostrarToast(mensaje, tipo = "exito") {
    let contenedorToasts = document.getElementById("contenedor-toasts-escolar");
    if (!contenedorToasts) {
      contenedorToasts = document.createElement("div");
      contenedorToasts.id = "contenedor-toasts-escolar";
      contenedorToasts.style.cssText =
        "position: fixed; top: 24px; right: 24px; z-index: 999999 !important; display: flex; flex-direction: column; gap: 12px; pointer-events: none;";
      document.body.appendChild(contenedorToasts);
    }

    // Configuración de paletas cromáticas integrales de alta visibilidad institucional
    let colorFondo = "#ecfdf5"; // Fondo verde claro suave
    let colorBorde = "#10b981"; // Borde verde esmeralda vibrante
    let colorTexto = "#064e3b"; // Texto verde muy oscuro (legibilidad máxima)
    let fondoIcono = "#ffffff"; // Contenedor del ícono en blanco para contraste
    let colorIcono = "#059669";
    let iconoVisual = "✓";

    if (tipo === "error") {
      colorFondo = "#fff1f2"; // Fondo rosado/rojo claro
      colorBorde = "#f43f5e"; // Borde rosa/rojo vibrante
      colorTexto = "#4c0519"; // Texto rojo vino muy oscuro
      fondoIcono = "#ffffff";
      colorIcono = "#e11d48";
      iconoVisual = "✕";
    } else if (tipo === "advertencia") {
      colorFondo = "#fffbeb"; // Fondo amarillo/ámbar claro
      colorBorde = "#f59e0b"; // Borde ámbar vibrante
      colorTexto = "#78350f"; // Texto marrón/miel muy oscuro
      fondoIcono = "#ffffff";
      colorIcono = "#d97706";
      iconoVisual = "⚠";
    }

    const elementoToast = document.createElement("div");

    // Tarjeta con fondo integral de color suave, bordes definidos del mismo tono y esquinas redondeadas
    elementoToast.style.cssText = `
      display: flex !important;
      align-items: flex-start !important;
      gap: 16px !important;
      padding: 16px !important;
      background-color: ${colorFondo} !important;
      border: 2px solid ${colorBorde} !important;
      border-radius: 12px !important;
      width: 380px !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08) !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      opacity: 0 !important;
      transform: translateX(50px) !important;
      pointer-events: auto !important;
      box-sizing: border-box !important;
    `;

    elementoToast.innerHTML = `
      <div style="display: flex !important; align-items: center !important; justify-content: center !important; width: 32px !important; height: 32px !important; min-width: 32px !important; border-radius: 8px !important; background-color: ${fondoIcono} !important; color: ${colorIcono} !important; font-size: 14px !important; font-weight: bold !important; margin: 0 !important; padding: 0 !important; flex-shrink: 0 !important; box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;">
        ${iconoVisual}
      </div>
      <div style="flex: 1 !important; color: ${colorTexto} !important; font-size: 14px !important; font-weight: 600 !important; line-height: 1.4 !important; padding-top: 4px !important; text-align: left !important;">
        ${mensaje}
      </div>
      <button style="background: none !important; border: none !important; color: ${colorBorde} !important; cursor: pointer !important; font-size: 22px !important; line-height: 1 !important; padding: 0 4px !important; margin: -2px 0 0 0 !important; transition: opacity 0.2s !important; outline: none !important; font-weight: bold !important; flex-shrink: 0 !important; opacity: 0.7 !important;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
        &times;
      </button>
    `;

    const botonCerrar = elementoToast.querySelector("button");
    botonCerrar.onclick = () => {
      elementoToast.style.opacity = "0";
      elementoToast.style.transform = "translateX(50px)";
      setTimeout(() => elementoToast.remove(), 300);
    };

    contenedorToasts.appendChild(elementoToast);

    setTimeout(() => {
      elementoToast.style.opacity = "1";
      elementoToast.style.transform = "translateX(0)";
    }, 20);

    // Auto-destrucción controlada
    setTimeout(() => {
      if (elementoToast.parentNode) {
        elementoToast.style.opacity = "0";
        elementoToast.style.transform = "translateX(50px)";
        setTimeout(() => elementoToast.remove(), 300);
      }
    }, 4500);
  }

  // Flujo de inicialización secuencial robusto y protegido contra bloqueos de red
  try {
    await verificarAutenticacionAdmin();
  } catch (e) {
    console.error("Fallo crítico en verificación de privilegios:", e);
  }

  try {
    await inicializarSemillaUsuarios();
  } catch (e) {
    console.error("Fallo crítico al inicializar usuarios semilla:", e);
  }

  try {
    await cargarRolesEnSelector();
  } catch (e) {
    console.error("Fallo no bloqueante al cargar roles en selector:", e);
  }

  try {
    await inicializarSelectoresCursos();
  } catch (e) {
    console.error("Fallo no bloqueante al inicializar selectores de cursos:", e);
  }

  try {
    await renderizarTablaUsuarios();
  } catch (e) {
    console.error("Fallo crítico al renderizar la tabla de usuarios:", e);
  }

  // Escuchadores de eventos globales
  if (selectRol) selectRol.addEventListener("change", gestionarPanelesFormulario);
  if (checkProfesor) checkProfesor.addEventListener("change", gestionarPanelesFormulario);
  if (selectAnioProfesor) selectAnioProfesor.addEventListener("change", cargarMateriasPorCursoSeleccionado);
  if (btnAgregarCatedra) btnAgregarCatedra.addEventListener("click", agregarCatedraProfesorBolsa);
  if (formUsuario) formUsuario.addEventListener("submit", procesarGuardarUsuario);
  if (btnCancelarEdicion) btnCancelarEdicion.addEventListener("click", desactivarModoEdicion);
  const reiniciarYPaginacion = () => {
    paginaActual = 1;
    renderizarTablaUsuarios();
  };
  if (filtroBusqueda) filtroBusqueda.addEventListener("input", reiniciarYPaginacion);
  if (filtroRolBase) filtroRolBase.addEventListener("change", reiniciarYPaginacion);
  if (filtroCursoDivision) filtroCursoDivision.addEventListener("change", reiniciarYPaginacion);

  // --- PROTECCIÓN COERCITIVA RBAC ---
  async function verificarAutenticacionAdmin() {
    const datosSesion = localStorage.getItem("usuarioActivo");
    if (!datosSesion) {
      window.location.href = "index.html";
      return;
    }
    const usuarioLogueado = JSON.parse(datosSesion);
    if (!usuarioLogueado.rol || !usuarioLogueado.rol.toLowerCase().trim().includes("admin")) {
      alert("Acceso denegado: Su rol no posee permisos de administración de cuentas.");
      window.location.href = "panel.html";
    }
  }

  // --- SEMILLA DE PERSONAL ESCOLAR PARA CLOUD FIRESTORE ---
  async function inicializarSemillaUsuarios() {
    try {
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      if (querySnapshot.empty) {
        console.log("Colección 'usuarios' vacía. Inyectando personal base del Colegio HASPEN...");
        const usuariosSemilla = [
          {
            dni: "11111111",
            nombre: "Administrador General",
            email: "admin@haspen.edu.ar",
            clave: "1234",
            rol: "administrador",
            esProfesor: false,
            cursosAsignados: [],
            bolsaHoras: []
          },
          {
            dni: "22222222",
            nombre: "Carlos Rodríguez",
            email: "carlos.r@haspen.edu.ar",
            clave: "22222222",
            rol: "preceptor",
            esProfesor: false,
            cursosAsignados: [],
            bolsaHoras: []
          },
          {
            dni: "33333333",
            nombre: "Ana Martínez",
            email: "ana.m@haspen.edu.ar",
            clave: "33333333",
            rol: "directivo",
            esProfesor: false,
            cursosAsignados: [],
            bolsaHoras: []
          }
        ];
        for (const usuario of usuariosSemilla) {
          await setDoc(doc(db, "usuarios", usuario.dni), usuario);
          console.log(`Usuario Semilla sincronizado con Firebase: [${usuario.nombre}]`);
        }
      }
    } catch (error) {
      console.error("Error al inyectar personal base en Firestore:", error);
      throw error;
    }
  }

  // --- INYECCIÓN DINÁMICA DE ROLES DESDE CLOUD FIRESTORE (EXTENDIDA CON CACHÉ LOCAL) ---
  async function cargarRolesEnSelector() {
    if (!rolUsuario) return;
    rolUsuario.innerHTML = '<option value="" disabled selected>Seleccione un rol...</option>';

    if (filtroRolBase) {
      filtroRolBase.innerHTML = '<option value="">Todos los cargos / roles</option>';
    }

    try {
      const querySnapshot = await getDocs(collection(db, "roles"));
      const listaRolesParaCache = []; // Matriz temporal de resguardo

      if (querySnapshot.empty) {
        rolUsuario.add(new Option("Administrador (Por Defecto)", "administrador"));
        if (filtroRolBase) filtroRolBase.add(new Option("Administrador (Por Defecto)", "administrador"));
        return;
      }

      querySnapshot.forEach((documento) => {
        const rol = documento.data();
        const nombreRol = rol.nombre;
        const idRol = rol.id.toLowerCase().trim();

        listaRolesParaCache.push(rol); // Almacenamos el objeto completo con sus permisos

        rolUsuario.add(new Option(nombreRol, idRol));

        if (filtroRolBase) {
          filtroRolBase.add(new Option(nombreRol, idRol));
        }
      });

      // Sincronizamos la memoria local para que la interfaz responda por capacidades RBAC
      localStorage.setItem("rolesColegio", JSON.stringify(listaRolesParaCache));
    } catch (error) {
      console.error("Error al inyectar catálogo de roles dinámicos:", error);
      rolUsuario.add(new Option("Administrador (Por Defecto)", "administrador"));
      if (filtroRolBase) filtroRolBase.add(new Option("Administrador (Por Defecto)", "administrador"));
    }
  }

  // --- INICIALIZACIÓN DE SELECTORES DE CURSOS ---

  async function inicializarSelectoresCursos() {
    let cursos = JSON.parse(localStorage.getItem("cursosColegio")) || [];

    if (cursos.length === 0) {
      try {
        const querySnapshot = await getDocs(collection(db, "cursos"));
        querySnapshot.forEach((docu) => {
          cursos.push({ id: docu.id, ...docu.data() });
        });
        localStorage.setItem("cursosColegio", JSON.stringify(cursos));
      } catch (error) {
        console.error(error);
      }
    }

    const contenedorCheckboxes = document.getElementById("contenedorCursosCheckboxes");
    const selectProf = document.getElementById("anioProfesor");
    const selectFiltro = document.getElementById("filtroCursoDivision");
    const chkTodos = document.getElementById("checkSeleccionarTodosLosCursos");

    if (selectProf) selectProf.innerHTML = '<option value="" disabled selected>Seleccione...</option>';
    if (selectFiltro) selectFiltro.innerHTML = '<option value="">Todos</option>';
    if (contenedorCheckboxes) contenedorCheckboxes.innerHTML = "";

    // 1. Crear las 6 columnas en el DOM
    const columnas = {};
    if (contenedorCheckboxes) {
      for (let i = 1; i <= 6; i++) {
        const col = document.createElement("div");
        col.style.cssText =
          "display: flex; flex-direction: column; gap: 4px; border-right: 1px solid #f1f5f9; padding-right: 4px;";
        if (i === 6) col.style.borderRight = "none";

        const tituloCol = document.createElement("div");
        tituloCol.style.cssText =
          "font-weight: bold; font-size: 11px; color: #475569; border-bottom: 2px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px; text-align: center;";
        tituloCol.textContent = `${i}° AÑO`;

        col.appendChild(tituloCol);
        columnas[i] = col;
        contenedorCheckboxes.appendChild(col);
      }
    }

    // PEGAR ESTE NUEVO BLOQUE CORREGIDO:
    cursos.forEach((curso, index) => {
      // Sincronización con las propiedades en minúscula de la base de datos
      if (!curso || !curso.ciclo) return;

      const texto = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
      if (selectProf) selectProf.add(new Option(texto, curso.id));
      if (selectFiltro) selectFiltro.add(new Option(texto, curso.id));

      // Extraer el número de año de forma segura
      const numAnio = parseInt(curso.ciclo.replace(/[^0-9]/g, ""));

      if (contenedorCheckboxes && columnas[numAnio]) {
        const divItem = document.createElement("div");
        divItem.style.cssText =
          "display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; gap: 6px !important; margin: 4px 0 !important; width: 100% !important; text-align: left !important; box-sizing: border-box !important;";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "cursosPreceptorMatriz";
        checkbox.value = curso.id;
        checkbox.id = `chk-curso-${index}`;
        checkbox.style.cssText =
          "width: 14px !important; height: 14px !important; min-width: 14px !important; max-width: 14px !important; margin: 0 !important; padding: 0 !important; cursor: pointer !important; display: inline-block !important; vertical-align: middle !important; flex: none !important;";

        const label = document.createElement("label");
        label.htmlFor = `chk-curso-${index}`;
        label.style.cssText =
          "width: auto !important; max-width: none !important; min-width: 0 !important; font-size: 11px !important; cursor: pointer !important; user-select: none !important; white-space: nowrap !important; display: inline-block !important; vertical-align: middle !important; line-height: 1.2 !important; margin: 0 0 0 4px !important; padding: 0 !important; color: #334155 !important; font-weight: 500 !important; text-align: left !important; flex: none !important;";

        label.textContent = `Div: ${curso.division} (${curso.turno})`;

        divItem.appendChild(checkbox);
        divItem.appendChild(label);
        columnas[numAnio].appendChild(divItem);
      }
    });

    // 3. Lógica y alineación estricta del checkbox Maestro "Seleccionar Todos"
    if (chkTodos) {
      const padreChkTodos = chkTodos.parentElement;
      if (padreChkTodos) {
        padreChkTodos.style.cssText =
          "background: #f1f5f9 !important; padding: 6px 12px !important; border-radius: 4px !important; margin-bottom: 10px !important; display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 8px !important; border: 1px solid #cbd5e1 !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; color: #475569 !important; font-size: 11px !important; font-weight: 600 !important;";
      }

      // Anulamos el ancho total heredado para centrar el cuadrito maestro de forma segura
      chkTodos.style.cssText =
        "width: 14px !important; height: 14px !important; min-width: 14px !important; max-width: 14px !important; margin: 0 !important; padding: 0 !important; cursor: pointer !important; display: inline-block !important; vertical-align: middle !important; flex: none !important;";

      chkTodos.addEventListener("change", () => {
        const checksCursos = document.querySelectorAll('input[name="cursosPreceptorMatriz"]');
        checksCursos.forEach((cb) => (cb.checked = chkTodos.checked));
      });
    }
  }
  async function cargarMateriasPorCursoSeleccionado() {
    const cursoId = document.getElementById("anioProfesor").value;
    const selectMateria = document.getElementById("materiaProfesor");
    if (!selectMateria) return;
    selectMateria.innerHTML = '<option value="" disabled selected>Seleccione materia...</option>';
    if (!cursoId) return;

    const cursosRaw = localStorage.getItem("cursosColegio");
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
    const cursoEncontrado = cursos.find((c) => c.id === cursoId);

    if (cursoEncontrado && cursoEncontrado.materias) {
      cursoEncontrado.materias.forEach((materia) => {
        selectMateria.add(new Option(materia, materia));
      });
    }
  }

  // FUNCIÓN COINCIDENTE PARA RENDERIZAR CHECKBOXES DINÁMICOS DESDE FIRESTORE
  function renderizarCheckboxesCursos() {
    const contenedor = document.getElementById("contenedorCursosCheckboxes");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    // Crear las 6 columnas fijas para los años (1° a 6°) usando Tailwind nativo
    for (let i = 1; i <= 6; i++) {
      const col = document.createElement("div");
      col.className = "flex flex-col gap-2 bg-gray-50 p-3 rounded border border-gray-200 text-left";
      col.innerHTML = `<h5 class="text-xs font-bold text-gray-700 border-b pb-1 mb-1">${i}° Año</h5>`;

      // Filtrar los cursos que pertenecen a este año desde la caché descargada
      const cursosDelAnio = (cacheCursos || []).filter((c) => {
        const cicloTexto = c.ciclo || "";
        return cicloTexto.startsWith(i + "°");
      });

      // Ordenar las divisiones alfabéticamente (A, B, C...)
      cursosDelAnio.sort((a, b) => (a.division || "").localeCompare(b.division || ""));

      if (cursosDelAnio.length === 0) {
        col.innerHTML += `<p class="text-xs text-gray-400 italic">Sin cursos</p>`;
      } else {
        cursosDelAnio.forEach((curso) => {
          const item = document.createElement("div");
          item.className = "flex items-center gap-2";

          const turnoLetra = (curso.turno || "").substring(0, 1).toUpperCase();
          const etiquetaVisual = `${curso.division} (${turnoLetra})`;

          item.innerHTML = `
            <input type="checkbox" name="cursosPreceptorMatriz" value="${curso.id}" id="chk-matriz-${curso.id}" class="rounded text-blue-600 focus:ring-blue-500 cursor-pointer">
            <label for="chk-matriz-${curso.id}" class="text-xs text-gray-700 cursor-pointer select-none">
              ${etiquetaVisual}
            </label>
          `;
          col.appendChild(item);
        });
      }
      contenedor.appendChild(col);
    }
  }

  // PARCHE DE AJUSTE DE SCOPE REUNIFICADO PARA GESTIONAR PANELES POR CAPACIDADES RBAC
  function gestionarPanelesFormulario() {
    const selectRol = document.getElementById("rolUsuario");
    const panelPreceptor = document.getElementById("grupoCursosPreceptor");
    const panelProfesor = document.getElementById("grupoAsignacionProfesor");
    const checkProfesor = document.getElementById("checkEsProfesor");

    if (!selectRol) return;

    const rolSeleccionado = selectRol.value;
    const rolesDisponibles = JSON.parse(localStorage.getItem("rolesColegio")) || [];
    const rolEncontrado = rolesDisponibles.find((r) => r.id === rolSeleccionado) || {};

    // Extracción segura del sub-objeto de permisos de la matriz RBAC institucional
    const permisosDelRol = rolEncontrado.permisos || {};
    const nivelLegajo = permisosDelRol.legajoDigital ? permisosDelRol.legajoDigital.toLowerCase().trim() : "ninguno";

    // El panel de asignación estructural se activa si el rol posee capacidades de consulta o edición
    const requiereAsignarCursos = nivelLegajo === "lectura" || nivelLegajo === "escritura";

    // Control visual del bloque de Cursos Estructurales (Panel Gris)
    if (panelPreceptor) {
      if (requiereAsignarCursos === true) {
        panelPreceptor.style.display = "block";
      } else {
        panelPreceptor.style.display = "none";
        // Desmarcar todos por seguridad si se cambia a un rol que no corresponde
        const checksCursos = document.querySelectorAll('input[name="cursosPreceptorMatriz"]');
        checksCursos.forEach((cb) => (cb.checked = false));
        const chkTodos = document.getElementById("checkSeleccionarTodosLosCursos");
        if (chkTodos) chkTodos.checked = false;
      }
    }

    // Control visual del bloque de Profesores (Bolsa de horas)
    if (panelProfesor && checkProfesor) {
      if (checkProfesor.checked || rolSeleccionado === "profesor") {
        panelProfesor.style.display = "block";
      } else {
        panelProfesor.style.display = "none";
      }
    }
  }

  // --- LECTURA DE USUARIOS DESDE FIRESTORE ---
  async function obtenerUsuariosDesdeFirestore() {
    try {
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      const lista = [];
      querySnapshot.forEach((docu) => {
        lista.push(docu.data());
      });
      return lista;
    } catch (error) {
      console.error("Error al recuperar nómina de usuarios:", error);
      return [];
    }
  }

  // REEMPLAZAR FUNCIÓN COMPLETA EN usuarios.js (Auditoría de Cátedras con UI Renovada y Lenguaje Institucional)
  async function agregarCatedraProfesorBolsa() {
    const selectCurso = document.getElementById("anioProfesor");
    const selectMateria = document.getElementById("materiaProfesor");
    const selectRevista = document.getElementById("revistaProfesor");

    if (
      !selectCurso ||
      !selectMateria ||
      !selectRevista ||
      selectCurso.selectedIndex <= 0 ||
      selectMateria.selectedIndex <= 0
    ) {
      mostrarToast("Por favor, seleccione un Curso, Materia y Situación de Revista válida para operar.", "advertencia");
      return;
    }

    const cursoIdReal = selectCurso.value;
    const textoCurso = selectCurso.options[selectCurso.selectedIndex].text;
    const nombreMateria = selectMateria.value;
    const situacionRevista = selectRevista.value;

    const baseCatedraId = `${cursoIdReal} - ${nombreMateria}`;
    const identificadorCompleto = `[${situacionRevista}] ${baseCatedraId}`;

    // 1. Control de duplicados en la sesión del formulario actual
    if (catedrasTemporales.some((c) => c.includes(baseCatedraId))) {
      mostrarToast(
        "Este docente ya posee una asignación registrada para esta misma materia y curso en el formulario actual.",
        "advertencia"
      );
      return;
    }

    try {
      const usuariosTotales = await obtenerUsuariosDesdeFirestore();
      const dniEdicion = document.getElementById("dniOriginalEdicion").value;
      let docentesAsignados = [];

      // 2. Auditoría en caliente cruzada contra otros docentes en el sistema institucional
      usuariosTotales.forEach((u) => {
        if (dniEdicion && u.dni === dniEdicion) return;
        const bolsa = u.bolsaHoras || [];
        bolsa.forEach((h) => {
          if (h.includes(baseCatedraId)) {
            const revistaOtro = h.match(/\[(.*?)\]/)?.[1] || "DESCONOCIDO";
            docentesAsignados.push({ nombre: u.nombre, revista: revistaOtro });
          }
        });
      });

      if (docentesAsignados.length > 0) {
        const tieneTitular = docentesAsignados.some((d) => d.revista === "TITULAR");

        // Bloqueo reglamentario institucional adaptado a Toast de advertencia
        if (situacionRevista === "TITULAR" && tieneTitular) {
          const nombreTitular = docentesAsignados.find((d) => d.revista === "TITULAR").nombre;
          mostrarToast(
            `Normativa Escolar: No se puede asignar como TITULAR. Este espacio ya posee un Docente Titular activo: ${nombreTitular}. Modifique la situación de revista a tipo Suplente.`,
            "error"
          );
          return;
        }

        const listaDetalle = docentesAsignados.map((d) => `• ${d.nombre} (${d.revista})`).join("\n");

        // Mensaje de confirmación interactivo con vocabulario claro para el operador escolar
        const autorizar = confirm(
          `Aviso del Sistema - Registro de Multi-Docentes:\n\n` +
            `El espacio de [ ${nombreMateria} en ${textoCurso} ] ya cuenta con personal asociado:\n${listaDetalle}\n\n` +
            `¿Desea autorizar el ingreso de este nuevo registro bajo la condición de cargo ${situacionRevista}?`
        );
        if (!autorizar) return;
      }
    } catch (e) {
      console.error("Error en validación de revista:", e);
    }

    // 3. Inyección segura en el array temporal de la vista
    catedrasTemporales.push(identificadorCompleto);
    mostrarToast("Espacio curricular añadido correctamente a la bolsa temporal del docente.", "exito");
    actualizarTagsBolsaHoras();
  }

  function actualizarTagsBolsaHoras() {
    const contenedor = document.getElementById("listaCatedrasProfesor");
    if (!contenedor) return;
    contenedor.innerHTML = "";
    if (catedrasTemporales.length === 0) {
      const sinCat = document.createElement("s" + "p" + "a" + "n");
      sinCat.style.color = "#94a3b8";
      sinCat.style.fontSize = "13px";
      sinCat.id = "sinCatedrasMensaje";
      sinCat.textContent = "No hay cátedras asignadas aún.";
      contenedor.appendChild(sinCat);
      return;
    }
    catedrasTemporales.forEach((catedra, indice) => {
      let colorFondo = "#e8f0fe";
      let colorTexto = "#1a73e8";
      if (catedra.includes("[TITULAR]")) {
        colorFondo = "#e6fffa";
        colorTexto = "#0d9488";
      } else if (catedra.includes("[SUPLENTE]")) {
        colorFondo = "#fff8e1";
        colorTexto = "#b78103";
      } else if (catedra.includes("[SUPL_SUPL]")) {
        colorFondo = "#fef2f2";
        colorTexto = "#dc2626";
      }

      const tag = document.createElement("s" + "p" + "a" + "n");
      tag.style.background = colorFondo;
      tag.style.color = colorTexto;
      tag.style.padding = "5px 10px";
      tag.style.borderRadius = "4px";
      tag.style.fontSize = "12px";
      tag.style.fontWeight = "600";
      tag.style.display = "inline-flex";
      tag.style.alignItems = "center";
      tag.style.gap = "6px";
      tag.style.margin = "4px";
      tag.textContent = catedra + " ";

      const btnRemover = document.createElement("s" + "t" + "r" + "o" + "n" + "g");
      btnRemover.style.color = "#d93025";
      btnRemover.style.cursor = "pointer";
      btnRemover.style.fontSize = "14px";
      btnRemover.textContent = "×";
      btnRemover.onclick = function () {
        removerCatedraBolsa(indice);
      };

      tag.appendChild(btnRemover);
      contenedor.appendChild(tag);
    });
  }

  window.removerCatedraBolsa = function (indice) {
    catedrasTemporales.splice(indice, 1);
    actualizarTagsBolsaHoras();
  };
  // Motor de conversión nativo SHA-256 para paridad con index.html
  async function generarHashSHA256(cadena) {
    const encoder = new TextEncoder();
    const datos = encoder.encode(cadena);
    const hashBuffer = await crypto.subtle.digest("SHA-256", datos);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function procesarGuardarUsuario(e) {
    e.preventDefault();
    const dniInput = document.getElementById("dniUsuario");
    const dni = dniInput.value.replace(/[^0-9]/g, "").trim();
    const nombreCompleto = document.getElementById("nombreApellido").value.trim();
    const email = document.getElementById("emailUsuario").value.trim();
    const rol = document.getElementById("rolUsuario").value.toLowerCase().trim();
    const esProfesor = document.getElementById("checkEsProfesor").checked;
    const permiteCargaTotalNotas = document.getElementById("permiteCargaTotalNotasAlta").checked;
    const valorGestionPeriodos = document.getElementById("checkGestionPeriodos").checked;
    const dniOriginal = document.getElementById("dniOriginalEdicion").value;

    // ====== PARCHE: Corrección tipográfica de captura de contraseña ======
    const inputClaveElement = document.getElementById("claveUsuario");
    const inputConfirmarElement = document.getElementById("confirmarClaveUsuario");

    const valClave = inputClaveElement ? inputClaveElement.value : "";
    const valConfirmar = inputConfirmarElement ? inputConfirmarElement.value : "";

    // === REEMPLAZO COMPONENTE VISUAL: VALIDACIONES ESCOLARES DEL FORMULARIO ===
    if (!dni || !nombreCompleto || !email || !rol) {
      mostrarToast(
        "Por favor, complete todos los campos obligatorios del formulario antes de continuar.",
        "advertencia"
      );
      return;
    }

    if (!dniOriginal) {
      if (!valClave || !valConfirmar) {
        mostrarToast(
          "Para registrar una cuenta nueva debe ingresar una contraseña y su confirmación correspondientemente.",
          "advertencia"
        );
        return;
      }
      if (valClave.length < 6) {
        mostrarToast(
          "La contraseña ingresada debe poseer un mínimo de 6 caracteres por seguridad del sistema.",
          "advertencia"
        );
        return;
      }
      if (valClave !== valConfirmar) {
        mostrarToast("Las contraseñas ingresadas no coinciden. Por favor, verifique los datos.", "error");
        return;
      }
    }

    // PEGAR ESTE NUEVO BLOQUE DE RECOLECCIÓN EN LOTE:
    let rolesCursos = [];
    const panelPreceptor = document.getElementById("grupoCursosPreceptor");

    // Si el recuadro de asignación está visible, recolectamos dinámicamente lo que se haya tildado
    if (panelPreceptor && panelPreceptor.style.display === "block") {
      const checkboxesMarcados = document.querySelectorAll('input[name="cursosPreceptorMatriz"]:checked');
      rolesCursos = Array.from(checkboxesMarcados).map((cb) => cb.value);
    }

    try {
      if (!dniOriginal) {
        const docRef = doc(db, "usuarios", dni);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          mostrarToast("Ya existe un miembro del personal registrado con el DNI ingresado.", "advertencia");
          return;
        }
        try {
          await mAuth.createUserWithEmailAndPassword(secondaryAuth, email, valClave);
          await mAuth.signOut(secondaryAuth);
        } catch (authError) {
          console.error("Error operativo de credenciales:", authError);
          if (authError.code !== "auth/email-already-in-use") {
            mostrarToast(
              "No se pudieron registrar las credenciales de acceso. Verifique el correo electrónico.",
              "error"
            );
            return;
          }
        }
      }
      const bolsaFinal =
        rol.includes("profesor") || rol.includes("docente") || esProfesor ? [...catedrasTemporales] : [];
      const payloadUsuario = {
        dni: dni,
        nombre: nombreCompleto,
        email: email,
        rol: rol,
        esProfesor: esProfesor,
        cursosAsignados: rolesCursos,
        bolsaHoras: bolsaFinal,
        permiteCargaTotalNotas: permiteCargaTotalNotas,
        permisoGestionPeriodos: valorGestionPeriodos
      };

      if (!dniOriginal) {
        payloadUsuario.clave = await generarHashSHA256(valClave);
      }

      if (dniOriginal && dniOriginal !== dni) {
        await deleteDoc(doc(db, "usuarios", dniOriginal));
      }

      await setDoc(doc(db, "usuarios", dni), payloadUsuario, { merge: true });

      // Mensaje institucional unificado e intuitivo para el operador de la secretaría
      mostrarToast(
        dniOriginal
          ? "Los datos del usuario fueron actualizados correctamente en el sistema."
          : "La cuenta de personal ha sido registrada con éxito en los registros del colegio.",
        "exito"
      );

      desactivarModoEdicion();
      await renderizarTablaUsuarios();
    } catch (error) {
      console.error("Error al persistir legajo:", error);
      mostrarToast("No se pudieron guardar los cambios debido a un inconveniente de conexión con el sistema.", "error");
    }
  }
  async function renderizarTablaUsuarios() {
    if (!tbody) return;
    tbody.innerHTML = "";

    const trCarga = document.createElement("tr");
    const tdCarga = document.createElement("td");
    tdCarga.colSpan = 6;
    tdCarga.style.cssText = "text-align:center; color:#1a73e8; font-weight:500; padding:25px;";
    tdCarga.textContent = "Sincronizando nómina escolar con Firebase Cloud...";
    trCarga.appendChild(tdCarga);
    tbody.appendChild(trCarga);

    const usuarios = await obtenerUsuariosDesdeFirestore();
    let roles = [];
    try {
      const snapRoles = await getDocs(collection(db, "roles"));
      snapRoles.forEach((r) => roles.push(r.data()));
    } catch (e) {
      console.error("Error al leer roles auxiliares:", e);
    }

    const txtBusqueda = document.getElementById("filtroBusquedaRapida")?.value.toLowerCase().trim() || "";
    const filtroRol = document.getElementById("filtroRolBase")?.value || "";
    const filtroCurso = document.getElementById("filtroCursoDivision")?.value || "";
    tbody.innerHTML = "";

    let usuariosFiltrados = usuarios.filter((user) => {
      const mBusqueda =
        !txtBusqueda ||
        user.nombre?.toLowerCase().includes(txtBusqueda) ||
        user.dni?.includes(txtBusqueda) ||
        user.email?.toLowerCase().includes(txtBusqueda);

      const mRol = !filtroRol || user.rol?.toLowerCase().trim() === filtroRol;

      const mCurso =
        !filtroCurso ||
        (user.cursosAsignados && user.cursosAsignados.includes(filtroCurso)) ||
        (user.bolsaHoras && user.bolsaHoras.some((h) => h.includes(filtroCurso)));

      return mBusqueda && mRol && mCurso;
    });
    // === CÁLCULO DE PAGINACIÓN ===
    const totalUsuariosFiltrados = usuariosFiltrados.length;
    const totalPaginas = Math.ceil(totalUsuariosFiltrados / usuariosPorPagina);

    // Si por los filtros aplicados la página actual quedó fuera de rango, la reseteamos a la primera
    if (paginaActual > totalPaginas) {
      paginaActual = 1;
    }

    // Cortamos el array para mostrar solo el segmento de la página actual
    const indiceInicio = (paginaActual - 1) * usuariosPorPagina;
    const indiceFin = indiceInicio + usuariosPorPagina;
    usuariosFiltrados = usuariosFiltrados.slice(indiceInicio, indiceFin);
    // =============================

    if (usuariosFiltrados.length === 0) {
      const trVacio = document.createElement("t" + "r");
      const tdVacio = document.createElement("t" + "d");
      tdVacio.colSpan = 6;
      tdVacio.style.cssText = "text-align:center; color:#94a3b8; padding:20px;";
      tdVacio.textContent = "No se encontraron registros bajo los criterios de auditoría seleccionados.";
      trVacio.appendChild(tdVacio);
      tbody.appendChild(trVacio);
      return;
    }
    usuariosFiltrados.forEach((user) => {
      const tr = document.createElement("t" + "r");
      tr.className = "fila-usuario";
      tr.style.borderBottom = "1px solid #f1f3f4";

      const tdDatos = document.createElement("t" + "d");
      tdDatos.style.cssText = "padding:12px; font-weight:500;";
      tdDatos.textContent = user.nombre;
      const spanDniSub = document.createElement("s" + "p" + "a" + "n");
      spanDniSub.style.cssText = "font-size:12px; color:#5f6368; display:block;";
      spanDniSub.textContent = "DNI: " + user.dni;
      tdDatos.appendChild(spanDniSub);

      const tdDni = document.createElement("t" + "d");
      tdDni.style.cssText = "padding:12px; color:#5f6368; font-size:13px;";
      tdDni.textContent = user.dni;

      const tdEmail = document.createElement("t" + "d");
      tdEmail.style.cssText = "padding:12px; color:#5f6368; font-size:13px;";
      tdEmail.textContent = user.email;

      const tdRol = document.createElement("t" + "d");
      tdRol.style.padding = "12px";
      const userRolNormalizado = user.rol ? user.rol.toLowerCase().trim() : "";
      const objetoRolEncontrado = roles.find((r) => r.id.toLowerCase().trim() === userRolNormalizado);
      const textRol = objetoRolEncontrado ? objetoRolEncontrado.nombre : user.rol;

      const bRol = document.createElement("s" + "p" + "a" + "n");
      bRol.className = "badge-rol";
      bRol.textContent = textRol;
      tdRol.appendChild(bRol);

      if (user.esProfesor && userRolNormalizado !== "profesor") {
        const bDoc = document.createElement("s" + "p" + "a" + "n");
        bDoc.className = "badge-docente";
        bDoc.style.cssText = "display:block; margin-top:4px;";
        bDoc.textContent = "✓ Función Docente";
        tdRol.appendChild(bDoc);
      }

      const tdResp = document.createElement("t" + "d");
      tdResp.style.cssText = "padding:12px; font-size:12px; vertical-align:top;";

      let flagResp = false;

      // PARCHE RBAC: Renderiza las divisiones asignadas si el usuario posee registros en su matriz de cobertura
      if (user.cursosAsignados && user.cursosAsignados.length > 0) {
        flagResp = true;
        const cursosRaw = localStorage.getItem("cursosColegio");
        const listaCursos = cursosRaw ? JSON.parse(cursosRaw) : [];
        const nombresCursos = user.cursosAsignados.map((id) => {
          const c = listaCursos.find((cur) => cur.id === id);
          if (!c) return "Sin Asignar";

          const cicloLimpio = c.ciclo.split("-")[0].trim();
          return `${cicloLimpio} ° ${c.division}`;
        });
        const dPre = document.createElement("div");
        dPre.innerHTML = "🔹 <strong>Cursos Asignados:</strong> " + nombresCursos.join(" y ");
        tdResp.appendChild(dPre);
      }

      const bolsaUser = user.bolsaHoras || [];
      if (bolsaUser.length > 0) {
        if (flagResp) {
          const sep = document.createElement("d" + "i" + "v");
          sep.style.cssText = "margin-top:6px; padding-top:6px; border-top:1px dashed #e2e8f0;";
          tdResp.appendChild(sep);
        }
        flagResp = true;
        const dDoc = document.createElement("d" + "i" + "v");
        dDoc.innerHTML = "💼 <strong>Horas Catedras:</strong>";
        const dLista = document.createElement("s" + "p" + "a" + "n");
        dLista.style.cssText = "font-size:11px; display:block; margin-top:2px; line-height:1.4;";

        // REEMPLAZAR EN usuarios.js (Bucle de renderizado de horas cátedra en la tabla con límite dinámico)
        const totalCatedrasCompletas = [];
        bolsaUser.forEach((h, index) => {
          let estiloColor = "color: #0d9488; font-weight:600; display:block;";
          if (h.includes("[SUPLENTE]")) estiloColor = "color: #b78103; font-weight:600; display:block;";
          if (h.includes("[SUPL_SUPL]")) estiloColor = "color: #dc2626; font-weight:600; display:block;";

          let textoMapeadoParaMostrar = h;
          const cursosRaw = localStorage.getItem("cursosColegio");
          const listaCursos = cursosRaw ? JSON.parse(cursosRaw) : [];

          const firmaPura = h.replace(/\[.*?\]\s*/, "").trim();
          const partesFirma = firmaPura.split(" - ");

          if (partesFirma.length >= 2) {
            const cId = partesFirma[0].trim();
            const mNombre = partesFirma[1].trim();

            const cRef = listaCursos.find((cur) => cur.id === cId);
            if (cRef) {
              const revistaTag = h.match(/\[(.*?)\]/)?.[0] || "[TITULAR]";
              textoMapeadoParaMostrar = `${revistaTag} ${cRef.ciclo} ° "${cRef.division}" ➔ ${mNombre}`;
            }
          }

          // Almacenamos el texto formateado para la lista completa del cartel flotante
          totalCatedrasCompletas.push(textoMapeadoParaMostrar);

          // Solo inyectamos visualmente en la tabla las primeras 2 materias
          if (index < 2) {
            const sItem = document.createElement("span");
            sItem.style.cssText = estiloColor;
            sItem.textContent = textoMapeadoParaMostrar;
            dLista.appendChild(sItem);
          }
        });

        // Si el profesor excede las 2 materias, agregamos el indicador dinámico interactivo
        if (bolsaUser.length > 2) {
          const materiasRestantes = bolsaUser.length - 2;
          const sMas = document.createElement("span");
          sMas.style.cssText =
            "color: #1a73e8; font-weight:700; display:block; margin-top:4px; cursor:help; text-decoration:underline dashed;";
          sMas.textContent = `➕ Ver ${materiasRestantes} materias más...`;
          // El atributo title genera el tooltip nativo del navegador al posicionar el puntero
          sMas.title = "NÓMINA COMPLETA DE ASIGNACIONES:\n" + totalCatedrasCompletas.join("\n");
          dLista.appendChild(sMas);
        }

        tdResp.appendChild(dDoc);
        tdResp.appendChild(dLista);
      }

      if (!flagResp) {
        const sNinguna = document.createElement("s" + "p" + "a" + "n");
        sNinguna.style.color = "#94a3b8";
        sNinguna.textContent = "Ninguna asignada";
        tdResp.appendChild(sNinguna);
      }

      const tdAcciones = document.createElement("t" + "d");
      tdAcciones.style.cssText =
        "padding:12px; text-align:center; display:flex; gap:8px; justify-content:center; align-items:flex-start;";

      // PARCHE DE ACCESO DE ÁMBITO GLOBAL PARA MÓDULO ASÍNCRONO
      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.style.cssText =
        "background:#1a73e8; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;";
      btnEditar.textContent = "Editar";
      btnEditar.onclick = function () {
        window.activarModoEdicion(user.dni);
      };

      const btnBorrar = document.createElement("b" + "u" + "t" + "t" + "o" + "n");
      btnBorrar.type = "button";
      btnBorrar.style.cssText =
        "background:#ea4335; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;";
      btnBorrar.textContent = "Borrar";
      btnBorrar.onclick = function () {
        eliminarCuentaUsuario(user.dni);
      };

      tdAcciones.appendChild(btnEditar);
      tdAcciones.appendChild(btnBorrar);

      tr.appendChild(tdDatos);
      tr.appendChild(tdDni);
      tr.appendChild(tdEmail);
      tr.appendChild(tdRol);
      tr.appendChild(tdResp);
      tr.appendChild(tdAcciones);
      tbody.appendChild(tr);
    });

    // === INYECCIÓN DE CONTROLES DE PAGINACIÓN ===
    const contenedorPaginacion = document.getElementById("paginacion-controles");
    if (contenedorPaginacion && totalPaginas > 1) {
      contenedorPaginacion.innerHTML = `
            <button id="btnAnterior" style="padding: 6px 12px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer;">◀ Anterior</button>
            <span style="padding: 0 10px; font-weight: 600;">Página ${paginaActual} de ${totalPaginas}</span>
            <button id="btnSiguiente" style="padding: 6px 12px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer;">Siguiente ▶</button>
        `;
      document.getElementById("btnAnterior").disabled = paginaActual === 1;
      document.getElementById("btnSiguiente").disabled = paginaActual === totalPaginas;
      document.getElementById("btnAnterior").onclick = () => {
        paginaActual--;
        renderizarTablaUsuarios();
      };
      document.getElementById("btnSiguiente").onclick = () => {
        paginaActual++;
        renderizarTablaUsuarios();
      };
    } else if (contenedorPaginacion) {
      contenedorPaginacion.innerHTML = "";
    }
  }

  // --- ANCLAJES GLOBALES AL OBJETO WINDOW ---
  window.activarModoEdicion = async function (dni) {
    const docRef = doc(db, "usuarios", dni);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const usuario = snap.data();

    const dniInput = document.getElementById("dniUsuario");
    if (dniInput) {
      dniInput.value = usuario.dni;
      dniInput.disabled = true;
    }

    document.getElementById("nombreApellido").value = usuario.nombre || "";
    document.getElementById("emailUsuario").value = usuario.email || "";
    document.getElementById("rolUsuario").value = usuario.rol ? usuario.rol.toLowerCase().trim() : "";
    document.getElementById("checkEsProfesor").checked = usuario.esProfesor || false;
    document.getElementById("permiteCargaTotalNotasAlta").checked = usuario.permiteCargaTotalNotas || false;
    document.getElementById("checkGestionPeriodos").checked = usuario.permisoGestionPeriodos || false;
    document.getElementById("dniOriginalEdicion").value = usuario.dni;
    document.getElementById("formTitulo").textContent = "Modificar Datos de Usuario";

    if (bannerEdicion) bannerEdicion.style.display = "block";
    gestionarPanelesFormulario();

    const userRol = usuario.rol ? usuario.rol.toLowerCase().trim() : "";
    if (usuario.cursosAsignados && usuario.cursosAsignados.length > 0) {
      setTimeout(() => {
        usuario.cursosAsignados.forEach((cursoId) => {
          const chk = document.querySelector(`input[name="cursosPreceptorMatriz"][value="${cursoId}"]`);
          if (chk) chk.checked = true;
        });
      }, 100); // Tolerancia temporal de milisegundos para garantizar el renderizado previo del DOM
    }

    catedrasTemporales = usuario.bolsaHoras ? [...usuario.bolsaHoras] : [];
    actualizarTagsBolsaHoras();
  };

  window.eliminarCuentaUsuario = async function (dni) {
    const datosSesion = localStorage.getItem("usuarioActivo");
    const usuarioLogueado = datosSesion ? JSON.parse(datosSesion) : {};

    // 1. Bloqueo de auto-eliminación con Toast estético y lenguaje institucional
    if (usuarioLogueado.dni === dni) {
      mostrarToast(
        "Operación no permitida: No puede eliminar la cuenta con la que se encuentra trabajando actualmente.",
        "advertencia"
      );
      return;
    }

    // 2. Confirmación tradicional adaptada temporalmente con lenguaje amigable
    if (
      !confirm(
        "¿Está completamente seguro de que desea remover esta cuenta de personal del sistema institucional? Esta acción no se puede deshacer."
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "usuarios", dni));
      mostrarToast("El registro del personal fue removido de la base de datos escolar correctamente.", "exito");
      await renderizarTablaUsuarios();
    } catch (e) {
      console.error("Error al remover el documento:", e);
      mostrarToast(
        "No se pudo completar la eliminación debido a un inconveniente de conexión con el sistema.",
        "error"
      );
    }
  };

  function desactivarModoEdicion() {
    document.getElementById("dniOriginalEdicion").value = "";
    document.getElementById("formTitulo").textContent = "Registrar Nuevo Usuario";
    if (bannerEdicion) bannerEdicion.style.display = "none";
    if (formUsuario) formUsuario.reset();

    const dniInput = document.getElementById("dniUsuario");
    if (dniInput) dniInput.disabled = false;

    if (claveUsuario) claveUsuario.value = "";
    if (confirmarClaveUsuario) confirmarClaveUsuario.value = "";

    document.getElementById("checkEsProfesor").checked = false;
    document.getElementById("permiteCargaTotalNotasAlta").checked = false;
    document.getElementById("checkGestionPeriodos").checked = false;
    catedrasTemporales = [];
    actualizarTagsBolsaHoras();
    // Parche de seguridad: Limpiar y destildar la grilla de checkboxes completa
    const checksCursosVaciar = document.querySelectorAll('input[name="cursosPreceptorMatriz"]');
    checksCursosVaciar.forEach((cb) => (cb.checked = false));
    const chkTodosVaciar = document.getElementById("checkSeleccionarTodosLosCursos");
    if (chkTodosVaciar) chkTodosVaciar.checked = false;
    gestionarPanelesFormulario();
  }
})();
