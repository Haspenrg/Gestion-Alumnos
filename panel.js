document.addEventListener("DOMContentLoaded", async function () {
  await verificarYConfigurarPanel();

  const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", cerrarSesion);
  }

  const btnCambiarClave = document.getElementById("btn-cambiar-clave-perfil");
  if (btnCambiarClave) {
    btnCambiarClave.addEventListener("click", gestionarCambioClaveAutónomo);
  }
});

async function obtenerSesionLocal() {
  try {
    const datosSesion = sessionStorage.getItem("usuarioActivo");
    if (!datosSesion) return null;

    if (typeof window.actualizarContadoresMonitor === "function") {
      window.actualizarContadoresMonitor("local_lectura", 1);
    }

    const usuario = JSON.parse(datosSesion);
    const cdn = "https://www.gstatic.com/firebasejs/10.12.0/";
    const { getAuth, onAuthStateChanged } = await import(`${cdn}firebase-auth.js`);
    const { firebaseApp } = await import("./firebase-config.js");
    const auth = getAuth(firebaseApp);
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve(usuario);
        } else {
          sessionStorage.removeItem("usuarioActivo");
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error("Error al verificar sesión activa con Firebase:", error);
    return null;
  }
}

async function verificarYConfigurarPanel() {
  const usuario = await obtenerSesionLocal();
  if (!usuario) {
    window.location.href = "index.html";
    return;
  }
  const rolIdMapeado = usuario.rol.toLowerCase().trim();

  document.getElementById("saludo-usuario").textContent = `Hola, ${usuario.nombre}`;
  document.getElementById("rol-usuario").textContent = `Perfil: ${usuario.rol.toUpperCase()}`;

  const mapaRutas = {
    "mod-usuarios": "usuarios.html",
    "mod-inscripcion": "inscripcion.html",
    "mod-cursos-materias": "cursos-materias.html",
    "mod-calificaciones": "calificaciones.html",
    "mod-previas": "previas.html",
    "mod-estadisticas": "estadisticas.html",
    "mod-roles": "roles.html",
    "mod-promocion": "promocion.html",
    "mod-comunicacion": "comunicacion.html",
    "mod-soporte": "soporte.html"
  };

  if (rolIdMapeado === "administrador") {
    Object.keys(mapaRutas).forEach((id) => configurarEnlaceModulo(id, mapaRutas[id]));

    // CONEXIÓN AUTÓNOMA EN TIEM realtime PARA EL GLOBO ROJO DEL ADMINISTRADOR
    (async function () {
      try {
        const cdnF = "https://www.gstatic.com/firebasejs/10.12.0/";
        const { getFirestore, collection, onSnapshot } = await import(`${cdnF}firebase-firestore.js`);
        const { firebaseApp } = await import("./firebase-config.js");
        const dbAdminBadge = getFirestore(firebaseApp);

        onSnapshot(collection(dbAdminBadge, "soporte_incidencias"), (snapshot) => {
          if (typeof window.actualizarContadoresMonitor === "function" && !snapshot.empty) {
            window.actualizarContadoresMonitor("firebase_lectura", snapshot.size);
          }

          const badgeVisual = document.getElementById("badgeSoporteAdmin");
          if (badgeVisual) {
            let ticketsAbiertos = 0;
            snapshot.forEach((docSnap) => {
              if (docSnap.data().estado === "Abierto") {
                ticketsAbiertos++;
              }
            });

            if (ticketsAbiertos > 0) {
              badgeVisual.textContent = ticketsAbiertos;
              badgeVisual.style.setProperty("display", "flex", "important");
            } else {
              badgeVisual.style.setProperty("display", "none", "important");
            }
          }
        });
      } catch (errBadge) {
        console.error("Error en el encendido autónomo del globo:", errBadge);
      }
    })();

    return;
  }
  bloquearModuloFisico("mod-roles");
  let permisos = usuario.permisosDelRol;

  if (!permisos) {
    Object.keys(mapaRutas).forEach((id) => {
      if (id !== "mod-roles") bloquearModuloFisico(id);
    });
    return;
  }

  evaluarPermisoModulo(
    "mod-usuarios",
    permisos.configuracionUsuarios,
    mapaRutas["mod-usuarios"],
    "Gestión de Usuarios"
  );
  evaluarPermisoModulo(
    "mod-cursos-materias",
    permisos.planesEstudio,
    mapaRutas["mod-cursos-materias"],
    "Crear Cursos y Materias"
  );
  evaluarPermisoModulo("mod-previas", permisos.controlPrevias, mapaRutas["mod-previas"], "Control de Previas");
  evaluarPermisoModulo(
    "mod-estadisticas",
    permisos.reportesEstadisticas,
    mapaRutas["mod-estadisticas"],
    "Estadísticas"
  );
  evaluarPermisoModulo("mod-inscripcion", permisos.legajoDigital, mapaRutas["mod-inscripcion"], "Gestión de Alumnos");

  const permisoCalificaciones = usuario.esProfesor ? "escritura" : permisos.libroCalificaciones;
  evaluarPermisoModulo("mod-calificaciones", permisoCalificaciones, mapaRutas["mod-calificaciones"], "Calificaciones");

  evaluarPermisoModulo("mod-promocion", permisos.promocionAcademica, mapaRutas["mod-promocion"], "Promoción Académica");
  evaluarPermisoModulo(
    "mod-comunicacion",
    permisos.comunicacionInstitucional,
    mapaRutas["mod-comunicacion"],
    "Comunicación Institucional"
  );
  evaluarPermisoModulo("mod-soporte", permisos.soporteTecnico, mapaRutas["mod-soporte"], "Soporte Técnico");

  try {
    const badgeSoporte = document.getElementById("badgeSoporteAdmin");
    if (badgeSoporte) {
      const cdnFirebase = "https://www.gstatic.com/firebasejs/10.12.0/";
      const { getFirestore, collection, query, where, onSnapshot } = await import(
        `${cdnFirebase}firebase-firestore.js`
      );
      const { firebaseApp } = await import("./firebase-config.js");
      const dbSoporte = getFirestore(firebaseApp);

      let consultaTickets;
      const nivelSoporte =
        permisos && permisos.soporteTecnico ? String(permisos.soporteTecnico).toLowerCase().trim() : "ninguno";

      if (nivelSoporte === "administrador") {
        consultaTickets = query(collection(dbSoporte, "soporte_incidencias"), where("estado", "==", "Abierto"));
      } else if (nivelSoporte === "usuario") {
        consultaTickets = query(
          collection(dbSoporte, "soporte_incidencias"),
          where("dniUsuario", "==", String(usuario.dni).trim()),
          where("estado", "==", "Resuelto")
        );
      } else {
        badgeSoporte.style.display = "none";
        consultaTickets = null;
      }

      if (consultaTickets) {
        onSnapshot(
          consultaTickets,
          (snapshot) => {
            if (typeof window.actualizarContadoresMonitor === "function" && !snapshot.empty) {
              window.actualizarContadoresMonitor("firebase_lectura", snapshot.size);
            } else if (!snapshot.empty) {
              const fbLecturasActuales = parseInt(localStorage.getItem("haspen_monitor_firebase_lectura")) || 0;
              localStorage.setItem("haspen_monitor_firebase_lectura", String(fbLecturasActuales + snapshot.size));
            }

            const cantidadTickets = snapshot.size;
            if (cantidadTickets > 0) {
              badgeSoporte.textContent = cantidadTickets;
              badgeSoporte.style.display = "block";
              if (nivelSoporte === "administrador") {
                badgeSoporte.style.backgroundColor = "#ef4444";
              } else {
                badgeSoporte.style.backgroundColor = "#10b981";
              }
            } else {
              badgeSoporte.style.display = "none";
            }
          },
          (errorSnapshot) => {
            console.error("Falla en la lectura asíncrona del Spark Plan (Soporte):", errorSnapshot);
          }
        );
      }
    }
  } catch (errSoporte) {
    console.error("Error crítico en la inicialización del Badge de Soporte:", errSoporte);
  }
}
// --- MOTOR CENTRALIZADO DE EVALUACIÓN DE NIVELES INSTITUCIONALES ---
function evaluarPermisoModulo(idModulo, nivelPermiso, urlDestino, nombreModulo) {
  if (!nivelPermiso || nivelPermiso === "ninguno") {
    bloquearModuloFisico(idModulo);
  } else if (nivelPermiso === "lectura") {
    configurarEnlaceModulo(idModulo, urlDestino);
    if (typeof configurarModoSoloLectura === "function") {
      configurarModoSoloLectura(idModulo, nombreModulo, urlDestino);
    }
  } else if (nivelPermiso === "escritura" || nivelPermiso === "usuario" || nivelPermiso === "administrador") {
    configurarEnlaceModulo(idModulo, urlDestino);
  }
}

function configurarEnlaceModulo(idModulo, destino) {
  const elemento = document.getElementById(idModulo);
  if (!elemento) return;

  elemento.classList.remove("modulo-bloqueado", "modulo-solo-lectura");
  elemento.style.opacity = "1";
  elemento.style.cursor = "pointer";
  elemento.style.userSelect = "auto";

  const hijos = elemento.querySelectorAll("*");
  hijos.forEach((hijo) => {
    hijo.style.pointerEvents = "auto";
  });

  elemento.onclick = function () {
    if (destino.startsWith("alert")) {
      const mensaje = destino.match(/'([^']+)'/);
      alert(mensaje ? mensaje[1] : "Próximamente");
    } else {
      window.location.href = destino;
    }
  };
}

// --- SISTEMA CENTRALIZADO DE NOTIFICACIONES ESTILIZADAS (TOAST) ---
function mostrarNotificacion(mensaje, tipo = "info") {
  const containerId = "contenedor-toasts-haspen";
  let contenedor = document.getElementById(containerId);

  if (contenedor && contenedor.childElementCount > 0) {
    return;
  }

  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = containerId;
    contenedor.style.cssText =
      "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 400px; width: calc(100% - 40px); pointer-events: none;";
    document.body.appendChild(contenedor);
  }

  const toast = document.createElement("div");
  const isError = tipo === "error";

  toast.style.cssText = `background-color: ${isError ? "#fde8e8" : "#e1effe"}; color: ${isError ? "#9b1c1c" : "#1e429f"}; border: 1px solid ${isError ? "#f8b4b4" : "#b3d1ff"}; padding: 20px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); text-align: center; opacity: 0; transition: opacity 0.3s ease-in-out; pointer-events: auto;`;
  toast.innerText = mensaje;
  contenedor.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
      if (contenedor.childElementCount === 0) contenedor.remove();
    }, 300);
  }, 4000);
}

function bloquearModuloFisico(idModulo) {
  const elemento = document.getElementById(idModulo);
  if (!elemento) return;

  elemento.removeAttribute("href");
  elemento.classList.remove("modulo-bloqueado", "modulo-solo-lectura");
  elemento.style.opacity = "0.4";
  elemento.style.cursor = "not-allowed";
  elemento.style.userSelect = "none";

  const hijos = elemento.querySelectorAll("*");
  hijos.forEach((hijo) => {
    hijo.style.pointerEvents = "none";
  });

  elemento.onclick = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    mostrarNotificacion(
      "Acceso denegado: Su rol actual no posee permisos parametrizados para ingresar a este módulo.",
      "error"
    );
    return false;
  };
}

function configurarModoSoloLectura(idModulo, nombreModulo, urlRedireccion) {
  const elemento = document.getElementById(idModulo);
  if (!elemento) return;
  elemento.classList.remove("modulo-bloqueado");
  elemento.classList.add("modulo-solo-lectura");
  elemento.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    mostrarNotificacion(
      `Acceso de SOLO LECTURA a [${nombreModulo}]. Operará bajo modalidad de consulta sin permisos de modificación.`,
      "info"
    );
    if (urlRedireccion) {
      setTimeout(() => {
        window.location.href = urlRedireccion;
      }, 3500);
    }
  };
}
// Auxiliar para generar el Hash SHA-256 de forma nativa y segura
async function generarHashSHA256(cadena) {
  const encoder = new TextEncoder();
  const datos = encoder.encode(cadena);
  const hashBuffer = await crypto.subtle.digest("SHA-256", datos);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function gestionarCambioClaveAutónomo() {
  const usuario = await obtenerSesionLocal();
  if (!usuario || !usuario.dni) return;

  const modalFondo = document.createElement("div");
  modalFondo.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;";

  const modalCuerpo = document.createElement("div");
  modalCuerpo.style.cssText =
    "background: white; padding: 25px; border-radius: 8px; max-width: 340px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center; font-family: sans-serif;";
  modalCuerpo.innerHTML = `
    <h3 style="color: #1b4d82; margin-top: 0; font-size: 1.2rem; margin-bottom: 15px;">Cambiar Contraseña</h3>
    <p style="font-size: 0.85rem; color: #555; margin-bottom: 5px; text-align: left; font-weight: 600;">Nueva contraseña:</p>
    <input type="password" id="input-nueva-clave-segura" style="width: 100%; padding: 8px; border: 1px solid #9ca3af; border-radius: 6px; margin-bottom: 15px; box-sizing: border-box; text-align: center; font-size: 1rem;">
    <p style="font-size: 0.85rem; color: #555; margin-bottom: 5px; text-align: left; font-weight: 600;">Confirmar contraseña:</p>
    <input type="password" id="input-confirmar-clave-segura" style="width: 100%; padding: 8px; border: 1px solid #9ca3af; border-radius: 6px; margin-bottom: 20px; box-sizing: border-box; text-align: center; font-size: 1rem;">
    <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="btn-cancelar-clave-segura" style="background: #e5e7eb; color: #374151; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Cancelar</button>
        <button id="btn-guardar-clave-segura" style="background: #1b4d82; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Guardar</button>
    </div>
  `;

  modalFondo.appendChild(modalCuerpo);
  document.body.appendChild(modalFondo);

  setTimeout(() => {
    const inputNueva = document.getElementById("input-nueva-clave-segura");
    if (inputNueva) inputNueva.focus();
  }, 50);

  document.getElementById("btn-cancelar-clave-segura").onclick = function () {
    modalFondo.remove();
  };

  document.getElementById("btn-guardar-clave-segura").onclick = async function () {
    const nuevaClave = document.getElementById("input-nueva-clave-segura").value;
    const confirmarClave = document.getElementById("input-confirmar-clave-segura").value;

    const claveLimpia = nuevaClave ? nuevaClave.trim() : "";
    const confirmacionLimpia = confirmarClave ? confirmarClave.trim() : "";

    if (claveLimpia.length < 6) {
      mostrarNotificacion(
        "Operación inválida: Por razones de seguridad la contraseña debe tener al menos 6 caracteres.",
        "error"
      );
      return;
    }
    if (claveLimpia !== confirmacionLimpia) {
      mostrarNotificacion("Operación inválida: La nueva contraseña y la confirmación no coinciden.", "error");
      return;
    }

    const btnGuardar = document.getElementById("btn-guardar-clave-segura");
    const btnCancelar = document.getElementById("btn-cancelar-clave-segura");
    btnGuardar.disabled = true;
    btnCancelar.disabled = true;
    btnGuardar.innerText = "Guardando...";
    btnGuardar.style.opacity = "0.7";
    btnGuardar.style.cursor = "wait";

    try {
      const claveHasheada = await generarHashSHA256(claveLimpia);
      const cdn = "https://www.gstatic.com/firebasejs/10.12.0/";

      const { getFirestore, doc, updateDoc } = await import(`${cdn}firebase-firestore.js`);
      const { firebaseApp } = await import("./firebase-config.js");
      const db = getFirestore(firebaseApp);

      const usuarioRef = doc(db, "usuarios", String(usuario.dni).trim());
      await updateDoc(usuarioRef, {
        clave: claveHasheada,
        ultimaModificacionClave: new Date().toISOString()
      });

      if (typeof window.actualizarContadoresMonitor === "function") {
        window.actualizarContadoresMonitor("firebase_escritura", 1);
      } else {
        const fbEscriturasActuales = parseInt(localStorage.getItem("haspen_monitor_firebase_escritura")) || 0;
        localStorage.setItem("haspen_monitor_firebase_escritura", String(fbEscriturasActuales + 1));
      }

      modalCuerpo.innerHTML = `
        <div style="text-align: center; padding: 15px;">
          <div style="color: #0e6245; font-size: 3rem; margin-bottom: 10px;">✓</div>
          <h3 style="color: #1b4d82; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; font-size: 1.2rem;">¡Sincronización Exitosa!</h3>
          <p style="color: #4b5563; margin-bottom: 20px; font-size: 0.9rem;">Contraseña actualizada en el sistema.<br>
            <span style="color: #941b1b; font-weight: bold;">Su sesión se cerrará por seguridad.</span></p>
          <button id="btn-entendido-clave" style="background: #1b4d82; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Entendido</button>
        </div>
      `;
      document.getElementById("btn-entendido-clave").onclick = function () {
        modalFondo.remove();
        cerrarSesion();
      };
    } catch (error) {
      console.error("Error crítico de sincronización con la base de datos:", error);
      modalCuerpo.innerHTML = `
        <div style="text-align: center; padding: 15px;">
          <div style="color: #941b1b; font-size: 3rem; margin-bottom: 10px;">✕</div>
          <h3 style="color: #941b1b; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; font-size: 1.2rem;">Error de Sincronización</h3>
          <p style="color: #4b5563; margin-bottom: 20px; font-size: 0.9rem;">Debe reautenticarse para aplicar el cambio.<br>
            <span style="font-weight: 600;">Intente cerrando sesión y volviendo a ingresar.</span></p>
          <button id="btn-entendido-error" style="background: #4b5563; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Cerrar</button>
        </div>
      `;
      document.getElementById("btn-entendido-error").onclick = function () {
        modalFondo.remove();
      };
    }
  };
}

function cerrarSesion() {
  sessionStorage.removeItem("usuarioActivo");
  window.location.href = "index.html";
}
