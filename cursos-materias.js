(async function () {
  "use strict";

  // Importación dinámica evasiva por sub-bloques de caracteres
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
  const { doc, getDoc, setDoc, collection, getDocs, deleteDoc, writeBatch, query, where, limit } = await import(
    b + "firebase-firestore.js"
  );
  // MOTOR DE ALERTAS Y CONFIRMACIONES ESTILIZADAS INSTITUCIONALES
  function dialogarAlerta(mensaje, esConfirmacion = false) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("customAlertOverlay");
      const box = document.getElementById("customAlertBox");
      const text = document.getElementById("customAlertText");
      const btnOk = document.getElementById("customAlertBtnOk");
      const btnCancel = document.getElementById("customAlertBtnCancel");

      if (!overlay || !box || !text || !btnOk || !btnCancel) {
        // Resguardo de contingencia si el DOM no cargó correctamente
        if (esConfirmacion) resolve(confirm(mensaje));
        else {
          alert(mensaje);
          resolve(true);
        }
        return;
      }

      text.textContent = mensaje;

      // Si es confirmación muestra el botón cancelar, sino lo oculta
      btnCancel.style.display = esConfirmacion ? "block" : "none";

      // Ajusta el color del borde superior según la gravedad del mensaje
      if (mensaje.includes("🛑") || mensaje.includes("Error") || mensaje.includes("⚠️")) {
        box.style.borderTopColor = "#ea4335"; // Rojo/Naranja de alerta
      } else {
        box.style.borderTopColor = "#1a73e8"; // Azul institucional
      }

      overlay.classList.add("active");

      const limpiarEventosYCerrar = (resultado) => {
        overlay.classList.remove("active");
        const nuevoBtnOk = btnOk.cloneNode(true);
        const nuevoBtnCancel = btnCancel.cloneNode(true);
        btnOk.parentNode.replaceChild(nuevoBtnOk, btnOk);
        btnCancel.parentNode.replaceChild(nuevoBtnCancel, btnCancel);
        resolve(resultado);
      };

      document.getElementById("customAlertBtnOk").addEventListener("click", () => limpiarEventosYCerrar(true));
      document.getElementById("customAlertBtnCancel").addEventListener("click", () => limpiarEventosYCerrar(false));
    });
  }

  // VALORES SEMILLA DE CONTINGENCIA INSTITUCIONAL
  let configDivisiones = ["A", "B", "C", "D", "E", "F", "G"];
  let configOrientaciones = {
    comun: ["PRÁCTICAS DEL LENGUAJE", "MATEMÁTICA", "INGLÉS", "LENGUAJES ARTÍSTICOS", "EDUCACIÓN FÍSICA"],
    basico: ["HISTORIA", "GEOGRAFÍA", "BIOLOGÍA", "FÍSICO-QUÍMICA", "CONSTRUCCIÓN CIUDADANA", "EDUCACIÓN TECNOLOGICA"],
    "Ciclo Básico": [],
    "Ciencias Sociales": [
      "HISTORIA ORIENTADA",
      "GEOGRAFÍA ORIENTADA",
      "BIOLOGÍA, QUÍMICA Y SOCIEDAD",
      "SALUD Y DERECHO",
      "SOCIOLOGÍA",
      "COMUNICACIÓN",
      "CIENCIAS POLÍTICAS",
      "FILOSOFÍA",
      "PSICOLOGÍA",
      "FÍSICA ORIENTADA",
      "ECONOMÍA"
    ],
    "Economía y Administración": [
      "ADMINISTRACIÓN",
      "SISTEMA INFORMACIÓN CONTABLE",
      "MICROECONOMÍA",
      "FILOSOFÍA",
      "DERECHO ECONÓMICO",
      "FÍSICA ORIENTADA",
      "LEGISLACIÓN IMPOSITIVA",
      "MICROEMPRENDIMIENTO",
      "ECONOMÍA"
    ],
    "Agro y Ambiente": [
      "CIENCIAS DE LA TIERRA",
      "AGROECOSISTEMA",
      "PRODUCCION VEGETAL",
      "EMPRENDIMIENTO",
      "PROCESOS PRODUCTIVOS"
    ]
  };
  let cacheCursos = []; // Caché en memoria local

  // Verificación estricta de sesión RBAC
  const datosSesion = sessionStorage.getItem("usuarioActivo");
  if (!datosSesion) {
    window.location.href = "index.html";
    return;
  }
  const usuarioLogueado = JSON.parse(datosSesion);
  const rolNormalizado = usuarioLogueado.rol ? usuarioLogueado.rol.toLowerCase().trim() : "";

  async function inicializarEstructura() {
    if (rolNormalizado.includes("admin")) {
      const btnToggle = document.getElementById("btn-toggle-semillas");
      if (btnToggle) {
        btnToggle.style.display = "block";
        btnToggle.addEventListener("click", alternarVisibilidadPanelSemillas);
      }

      const btnAddOrientacion = document.getElementById("btn-add-orientacion");
      if (btnAddOrientacion) btnAddOrientacion.addEventListener("click", agregarNuevaOrientacionCaliente);
      const btnAddDivision = document.getElementById("btn-add-division");
      if (btnAddDivision) btnAddDivision.addEventListener("click", agregarNuevaDivisionCaliente);
    } // <-- Asegurate de dejar esta llave de cierre de la función inicializarEstructura()

    // Control Dinámico de Layout Responsivo
    const gridPrincipal = document.querySelector(".grid-formulario");
    if (gridPrincipal) {
      if (rolNormalizado.includes("direct") || rolNormalizado.includes("dir")) {
        const contenedorForm = document.querySelector(".form-container");
        if (contenedorForm) contenedorForm.style.display = "none";
        gridPrincipal.style.gridTemplateColumns = "1fr";
      } else {
        const adaptarLayout = () => {
          if (window.innerWidth >= 1024) {
            gridPrincipal.style.gridTemplateColumns = "0.75fr 2.25fr";
          } else {
            gridPrincipal.style.gridTemplateColumns = "1fr";
          }
        };
        adaptarLayout();
        window.addEventListener("resize", adaptarLayout);
      }
    }

    // ACTIVACIÓN DE ESCUCHADORES REACTIVOS CRUZADOS
    const filtroAnioElement = document.getElementById("filtro-anio");
    const filtroOriElement = document.getElementById("filtro-orientacion");
    const filtroTurnoElement = document.getElementById("filtro-turno");

    if (filtroAnioElement) filtroAnioElement.addEventListener("change", aplicarFiltrosCurriculares);
    if (filtroOriElement) filtroOriElement.addEventListener("change", aplicarFiltrosCurriculares);
    if (filtroTurnoElement) filtroTurnoElement.addEventListener("change", aplicarFiltrosCurriculares);

    await cargarConfiguracionBaseFirestore();
    inicializarSelectoresBase();
    await renderizarTablaCursos();

    const selectCiclo = document.getElementById("select-ciclo");
    if (selectCiclo) selectCiclo.addEventListener("change", actualizarFiltroOrientacionesPorAño);

    const selectOrientacion = document.getElementById("select-orientacion");
    if (selectOrientacion) selectOrientacion.addEventListener("change", cargarMateriasSugeridas);

    const formCurso = document.getElementById("form-curso");
    if (formCurso) formCurso.addEventListener("submit", procesarGuardarCurso);

    const btnCancelarEdicion = document.getElementById("btn-cancelar-edicion-curso");
    if (btnCancelarEdicion) btnCancelarEdicion.addEventListener("click", salirModoEdicion);
  }

  function alternarVisibilidadPanelSemillas() {
    const panelExpansion = document.getElementById("panel-expansion-institucional");
    if (!panelExpansion) return;
    if (panelExpansion.style.display === "grid") {
      panelExpansion.style.display = "none";
    } else {
      panelExpansion.style.display = "grid";
      panelExpansion.scrollIntoView({ behavior: "smooth" });
    }
  }
  async function cargarConfiguracionBaseFirestore() {
    try {
      const docRef = doc(db, "configuracion", "valoresBase");
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        const datos = docSnapshot.data();
        if (datos.divisiones && datos.divisiones.length > 0) configDivisiones = datos.divisiones;
        if (datos.orientaciones) configOrientaciones = datos.orientaciones;
      } else {
        await setDoc(docRef, { divisiones: configDivisiones, orientaciones: configOrientaciones });
      }
    } catch (error) {
      console.warn("Fallo de red en Cloud Firestore, operando localmente:", error);
    }
  }

  async function agregarNuevaDivisionCaliente() {
    const input = document.getElementById("input-nueva-division");
    if (!input) return;
    const divisionNueva = input.value.trim().toUpperCase();
    if (!divisionNueva) return;
    if (configDivisiones.includes(divisionNueva)) {
      await dialogarAlerta("La división ingresada ya se encuentra activa.");
      return;
    }
    configDivisiones.push(divisionNueva);
    configDivisiones.sort();
    try {
      await setDoc(
        doc(db, "configuracion", "valoresBase"),
        { divisiones: configDivisiones, orientaciones: configOrientaciones },
        { merge: true }
      );
      await dialogarAlerta(`División "${divisionNueva}" inyectada con éxito en Cloud Firestore.`);
      input.value = "";
      inicializarSelectoresBase();
    } catch (e) {
      await dialogarAlerta("Error al intentar sincronizar con el servidor remoto.");
    }
  }

  async function agregarNuevaOrientacionCaliente() {
    const inputOri = document.getElementById("input-nueva-orientacion");
    const inputMats = document.getElementById("input-nuevas-materias");
    if (!inputOri || !inputMats) return;
    const nombreOri = inputOri.value.trim();
    const materiasTexto = inputMats.value.trim();
    if (!nombreOri || !materiasTexto) {
      await dialogarAlerta("Complete el nombre de la especialidad y cargue al menos una materia.");
      return;
    }
    if (configOrientaciones[nombreOri]) {
      await dialogarAlerta("Esta orientación académica ya está registrada.");
      return;
    }
    const arrayMaterias = materiasTexto
      .split(",")
      .map((m) => m.trim().toUpperCase())
      .filter((m) => m.length > 0);
    configOrientaciones[nombreOri] = arrayMaterias;
    try {
      await setDoc(
        doc(db, "configuracion", "valoresBase"),
        { divisiones: configDivisiones, orientaciones: configOrientaciones },
        { merge: true }
      );
      await dialogarAlerta(`Modalidad/Especialidad "${nombreOri}" corporada en Cloud Firestore.`);
      inputOri.value = "";
      inputMats.value = "";
      inicializarSelectoresBase();
    } catch (e) {
      await dialogarAlerta("Error al intentar sincronizar con el servidor remoto.");
    }
  }

  function inicializarSelectoresBase() {
    const selectDiv = document.getElementById("select-division");
    if (!selectDiv) return;
    selectDiv.innerHTML = '<option value="">Seleccione división...</option>';
    configDivisiones.forEach((div) => selectDiv.add(new Option(div, div)));
    actualizarFiltroOrientacionesPorAño();
  }

  function actualizarFiltroOrientacionesPorAño() {
    const selectCiclo = document.getElementById("select-ciclo");
    const selectOri = document.getElementById("select-orientacion");
    if (!selectCiclo || !selectOri) return;

    const ciclo = selectCiclo.value; // Ej: "1° Año" o "4° Año"
    const valorGuardadoEdicion = window.orientacionEditarCarga || "";

    selectOri.innerHTML = '<option value="">Seleccione orientación...</option>';

    if (!ciclo) {
      cargarMateriasSugeridas();
      return;
    }

    // Evaluamos si el año corresponde al primer bloque común o al segundo orientado
    const esAnioBajo = ciclo.includes("1°") || ciclo.includes("2°") || ciclo.includes("3°");

    if (esAnioBajo) {
      selectOri.add(new Option("Ciclo Básico", "Ciclo Básico"));
      selectOri.value = "Ciclo Básico";
    } else {
      // Para 4°, 5° y 6° año se listan las especialidades reales de la institución
      Object.keys(configOrientaciones).forEach((ori) => {
        if (ori !== "comun" && ori !== "basico" && ori !== "Ciclo Básico" && ori !== "Común (1° a 3° Año)") {
          selectOri.add(new Option(ori, ori));
        }
      });
      if (
        valorGuardadoEdicion &&
        valorGuardadoEdicion !== "Ciclo Básico" &&
        valorGuardadoEdicion !== "Común (1° a 3° Año)"
      ) {
        selectOri.value = valorGuardadoEdicion;
      }
    }

    cargarMateriasSugeridas();
  }

  function cargarMateriasSugeridas() {
    const selectCiclo = document.getElementById("select-ciclo");
    const selectOrientacion = document.getElementById("select-orientacion");
    const contenedor = document.getElementById("contenedor-materias-checkbox");
    if (!selectCiclo || !selectOrientacion || !contenedor) return;

    const ciclo = selectCiclo.value;
    const orientacion = selectOrientacion.value;

    if (!ciclo || !orientacion) {
      contenedor.innerHTML =
        '<p style="font-size: 13px; color: #666; margin: 0;">Seleccione Año y Orientación para desplegar el mapa estricto de asignaturas.</p>';
      return;
    }

    contenedor.innerHTML = "";
    let listaMaterias = [...configOrientaciones.comun];

    const esAnioBajo = ciclo.includes("1°") || ciclo.includes("2°") || ciclo.includes("3°");

    if (esAnioBajo) {
      // Combina el tronco común escolar más las materias específicas de los primeros años
      listaMaterias = listaMaterias.concat(configOrientaciones.basico);
    } else {
      // Trae las materias de la especialidad correspondiente elegida en el select
      if (configOrientaciones[orientacion]) {
        listaMaterias = listaMaterias.concat(configOrientaciones[orientacion]);
      }
    }

    const materiasPreviamenteSeleccionadas = window.materiasEditarCarga || [];

    listaMaterias.forEach((materia, i) => {
      const item = document.createElement("div");
      item.style.margin = "4px 0";
      item.style.display = "grid";
      item.style.gridTemplateColumns = "24px 1fr";
      item.style.alignItems = "center";

      const checkedAttr = materiasPreviamenteSeleccionadas.includes(materia) ? "checked" : "";
      item.innerHTML = `
                        <input type="checkbox" name="materias-curso" value="${materia}" id="mat-${i}" ${checkedAttr} style="margin: 0; cursor: pointer;">
                        <label for="mat-${i}" style="font-size: 13px; cursor: pointer; color: #3c4043; font-weight: normal; line-height: 1.2; text-align: left; width: 100%;">
                            ${materia}
                        </label>
                    `;
      contenedor.appendChild(item);
    });
  }

  async function procesarGuardarCurso(e) {
    e.preventDefault();
    const idEdicion = document.getElementById("idOriginalEdicion").value;
    const selectCiclo = document.getElementById("select-ciclo");
    const selectDivision = document.getElementById("select-division");
    const selectTurno = document.getElementById("select-turno");
    const selectOrientacion = document.getElementById("select-orientacion");
    if (!selectCiclo || !selectDivision || !selectTurno || !selectOrientacion) return;
    const ciclo = selectCiclo.value;
    const division = selectDivision.value;
    const turno = selectTurno.value;
    const orientacion = selectOrientacion.value;
    const checkboxes = document.querySelectorAll('input[name="materias-curso"]:checked');
    if (checkboxes.length === 0) {
      await dialogarAlerta(
        "Error: Debe asociar al menos una materia para registrar la estructura curricular del curso."
      );
      return;
    }
    const materiasSeleccionadas = Array.from(checkboxes).map((cb) => cb.value);
    const numeroAnio = ciclo.charAt(0);
    const letraTurno = turno.substring(0, 1).toUpperCase();
    const cursoId = `${numeroAnio}-${division}-${letraTurno}`;

    try {
      if (!idEdicion) {
        const docCursoRef = doc(db, "cursos", cursoId);
        const checkDoc = await getDoc(docCursoRef);
        if (checkDoc.exists()) {
          await dialogarAlerta(
            "Error: Esta estructura de curso, división y turno ya se encuentra registrada en Firestore."
          );
          return;
        }
      }
      if (idEdicion && idEdicion !== cursoId) {
        const usuarioConfirmaReubicacion = await dialogarAlerta(
          `Ha modificado parámetros clave del curso. Los alumnos asignados al ID anterior ("${idEdicion}") se enviarán a Mesa de Entrada de forma automática. ¿Desea continuar?`,
          true
        );
        if (usuarioConfirmaReubicacion) {
          await reubicarAlumnosAMesaEntrada(idEdicion);
          await deleteDoc(doc(db, "cursos", idEdicion));
        } else {
          return;
        }
      }
      const docDestinoRef = doc(db, "cursos", cursoId);
      // Incorporación nativa del estado de activación del curso (Paso 1 previo)
      const nuevoCurso = {
        id: cursoId,
        ciclo,
        division,
        turno,
        orientacion,
        materias: materiasSeleccionadas,
        activo: true
      };
      await setDoc(docDestinoRef, nuevoCurso);

      await dialogarAlerta(
        idEdicion
          ? "Estructura Curricular actualizada con éxito."
          : "Estructura Curricular registrada con éxito en Cloud Firestore."
      );
      salirModoEdicion();
      await renderizarTablaCursos();
    } catch (error) {
      console.error("Error al persistir el curso:", error);
      await dialogarAlerta("Error: No se pudieron guardar los cambios en el servidor.");
    }
  }

  async function cargarCursoEnFormulario(idCurso) {
    try {
      const docSnapshot = await getDoc(doc(db, "cursos", idCurso));
      if (!docSnapshot.exists()) return;
      const curso = docSnapshot.data();
      document.getElementById("idOriginalEdicion").value = curso.id;
      document.getElementById("formulario-titulo-curso").textContent = "Modificar Estructura Curricular";
      document.getElementById("btn-submit-formulario").textContent = "Guardar Cambios Estructurales";
      document.getElementById("banner-edicion-curso").style.display = "block";
      document.getElementById("select-ciclo").value = curso.ciclo || "";
      document.getElementById("select-division").value = curso.division || "";
      document.getElementById("select-turno").value = curso.turno || "";
      window.orientacionEditarCarga = curso.orientacion || "";
      window.materiasEditarCarga = curso.materias || [];
      actualizarFiltroOrientacionesPorAño();
      document.getElementById("formulario-titulo-curso").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error al recuperar el legajo del curso:", error);
      await dialogarAlerta("No se pudo cargar la información para su edición.");
    }
  }

  function salirModoEdicion() {
    const form = document.getElementById("form-curso");
    if (form) form.reset();
    document.getElementById("idOriginalEdicion").value = "";
    document.getElementById("formulario-titulo-curso").textContent = "Configurar Curso y Materias";
    document.getElementById("btn-submit-formulario").textContent = "Registrar Estructura Completa";
    document.getElementById("banner-edicion-curso").style.display = "none";
    window.materiasEditarCarga = [];
    window.orientacionEditarCarga = "";
    actualizarFiltroOrientacionesPorAño();
  }

  async function reubicarAlumnosAMesaEntrada(idCurso) {
    const q = query(collection(db, "alumnos"), where("cursoId", "==", idCurso));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const lote = writeBatch(db);
      snapshot.forEach((documento) => {
        const refAlumno = doc(db, "alumnos", documento.id);
        lote.update(refAlumno, {
          cursoId: "",
          estado: "Entrante",
          observaciones:
            (documento.data().observaciones || "") +
            `\n[Auditoría: Reubicado automáticamente en Mesa de Entrada por remoción o alteración del curso ${idCurso}].`
        });
      });
      await lote.commit();
    }
  }

  async function renderizarTablaCursos() {
    const tbody = document.getElementById("tabla-cursos-body");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #1a73e8; font-weight: 500;">🔄 Sincronizando registros curriculares con Cloud Firestore...</td></tr>`;
    try {
      const querySnapshot = await getDocs(collection(db, "cursos"));
      cacheCursos = [];
      querySnapshot.forEach((documento) => {
        cacheCursos.push(documento.data());
      });
      aplicarFiltrosCurriculares();
    } catch (error) {
      console.error("Error al descargar listado de cursos:", error);
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #ea4335;">Error al cargar datos.</td></tr>`;
    }
  }

  function aplicarFiltrosCurriculares() {
    const tbody = document.getElementById("tabla-cursos-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    const valAnio = document.getElementById("filtro-anio").value;
    const valOri = document.getElementById("filtro-orientacion").value;
    const valTurno = document.getElementById("filtro-turno").value
      ? document.getElementById("filtro-turno").value.trim()
      : "";

    const registrosFiltrados = cacheCursos.filter((curso) => {
      // MIGRACIÓN EN CALIENTE: Si 'activo' no está definido, se asume true por defecto
      const estaActivo = curso.activo !== false;

      // Filtro estricto: En esta tabla solo listamos las estructuras que están operativas
      if (!estaActivo) return false;

      // Compara de forma exacta el año limpio ("1° Año", "2° Año", etc.)
      const cumpleAnio = !valAnio || curso.ciclo === valAnio;
      const cumpleOri = !valOri || curso.orientacion === valOri;

      const turnoCursoLimpio = curso.turno ? curso.turno.toString().trim() : "";
      const cumpleTurno = !valTurno || turnoCursoLimpio === valTurno;

      return cumpleAnio && cumpleOri && cumpleTurno;
    });

    if (registrosFiltrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #94a3b8;">No se encontraron estructuras con los filtros aplicados.</td></tr>`;
      return;
    }

    registrosFiltrados.forEach((curso) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #f1f3f4";
      const listaMateriasTexto = curso.materias ? curso.materias.join(", ") : "";
      let botonesAcciones = `<span style="color:#94a3b8; font-size:11px;">Restringido</span>`;
      if (rolNormalizado.includes("admin")) {
        botonesAcciones = `
                            <div style="display: flex; gap: 6px; justify-content: center;">
                                <button type="button" class="btn-accion-editar" data-id="${curso.id}" style="background:#1a73e8; color:#fff; border:none; padding: 6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">Editar</button>
                                <button type="button" class="btn-accion-inhabilitar" data-id="${curso.id}" style="background:#f2994a; color:#fff; border:none; padding: 6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">Inhabilitar</button>
                                <button type="button" class="btn-accion-eliminar" data-id="${curso.id}" style="background:#ea4335; color:#fff; border:none; padding: 6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">Borrar</button>
                            </div>`;
      }
      tr.innerHTML = `
                        <td style="padding: 5px 12px; font-weight: 500;">${curso.ciclo || ""}<br><span style="color:#5f6368; font-size:12px;">División: ${curso.division || ""} (${curso.turno || ""})</span></td>
                        <td style="padding: 5px 12px; font-size: 13px; color: #1a73e8; font-weight: bold;">${curso.orientacion || "Sin Especificar"}</td>
                        <td style="padding: 5px 12px; font-size: 12px; color: #5f6368; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${listaMateriasTexto}">${listaMateriasTexto}</td>
                        <td style="padding: 5px 12px; text-align: center;">${botonesAcciones}</td>`;
      tbody.appendChild(tr);
    });

    tbody
      .querySelectorAll(".btn-accion-editar")
      .forEach((b) => b.addEventListener("click", (e) => cargarCursoEnFormulario(e.target.getAttribute("data-id"))));
    // ESCUDO DE SEGURIDAD: Escuchador para inhabilitar estructuras sin alumnos activos (Estilizado)
    tbody.querySelectorAll(".btn-accion-inhabilitar").forEach((b) =>
      b.addEventListener("click", async (e) => {
        const idCurso = e.target.getAttribute("data-id");

        try {
          // Consulta estricta en la colección de alumnos para el ciclo lectivo actual
          const q = query(
            collection(db, "alumnos"),
            where("cursoId", "==", idCurso),
            where("estado", "in", ["Activo", "Regular"]),
            limit(1)
          );

          const snapshotAlumnos = await getDocs(q);

          // Si el semáforo encuentra alumnos cursando hoy, bloquea la acción inmediatamente
          if (!snapshotAlumnos.empty) {
            await dialogarAlerta(
              `🛑 Operación Cancelada: No es posible inhabilitar el curso "${idCurso}" porque registra alumnos cursando en el ciclo actual. Primero reubique a los estudiantes desde el módulo de inscripciones.`
            );
            return;
          }

          // Si está vacío hoy, se procede al archivado seguro (Baja Lógica)
          const usuarioConfirma = await dialogarAlerta(
            `¿Desea inhabilitar y archivar el curso "${idCurso}"?\n\nDejará de estar disponible para nuevas inscripciones pero se preservará su historial de años anteriores.`,
            true
          );

          if (usuarioConfirma) {
            await setDoc(doc(db, "cursos", idCurso), { activo: false }, { merge: true });
            await dialogarAlerta(`El curso "${idCurso}" ha sido archivado con éxito.`);
            salirModoEdicion();
            await renderizarTablaCursos();
          }
        } catch (error) {
          console.error("Error al intentar archivar el curso:", error);
          await dialogarAlerta("Error: No se pudo verificar el estado de los alumnos en el servidor.");
        }
      })
    );

    // ESCUDO HISTÓRICO: Escuchador para eliminación física estricta (Estilizado)
    tbody.querySelectorAll(".btn-accion-eliminar").forEach((b) =>
      b.addEventListener("click", async (e) => {
        const idCurso = e.target.getAttribute("data-id");

        try {
          // Escaneo forense: Busca si el curso existió en la historia de cualquier alumno (activo, egresado, etc.)
          const qHistorica = query(collection(db, "alumnos"), where("cursoId", "==", idCurso));
          const snapshotHistorico = await getDocs(qHistorica);

          // Si el curso tiene historia académica, se prohíbe su destrucción física para no romper boletines viejos
          if (!snapshotHistorico.empty) {
            await dialogarAlerta(
              `🛑 Destrucción Bloqueada: El curso "${idCurso}" contiene registros históricos en los legajos de la institución. Para quitarlo de la vista del ciclo actual sin corromper el historial de boletines anteriores, utilice el botón "Inhabilitar".`
            );
            return;
          }

          // Si el curso está virgen y se creó por error, se permite borrarlo por completo de Firebase
          const usuarioConfirmaBorrado = await dialogarAlerta(
            `⚠️ ATENCIÓN: El curso "${idCurso}" no registra alumnos en el historial. ¿Está seguro de eliminarlo físicamente de la base de datos de forma definitiva? Esta acción no se puede deshacer.`,
            true
          );

          if (usuarioConfirmaBorrado) {
            await deleteDoc(doc(db, "cursos", idCurso));
            await dialogarAlerta(`Estructura curricular "${idCurso}" eliminada definitivamente.`);
            salirModoEdicion();
            await renderizarTablaCursos();
          }
        } catch (error) {
          console.error("Error en el escudo de borrado físico:", error);
          await dialogarAlerta("Error: No se pudo verificar la integridad histórica en el servidor.");
        }
      })
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarEstructura);
  } else {
    await inicializarEstructura();
  }
})();
