// Importación dinámica desarmada indestructible
const b = "https://www.gstatic.com/firebasejs/10.12.0/";
const { auth, db } = await import("./firebase-config.js");
const { signInWithEmailAndPassword, sendPasswordResetEmail } = await import(b + "firebase-auth.js");
const { doc, getDoc } = await import(b + "firebase-firestore.js");

async function generarHashSHA256(cadena) {
  if (window.crypto && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const datos = encoder.encode(cadena);
      const hashBuffer = await crypto.subtle.digest("SHA-256", datos);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {}
  }

  const chk = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19, 0x428a2f98,
    0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6,
    0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354,
    0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624,
    0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
    0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let s = cadena + "\x80",
    w = new Uint32Array(64),
    h = chk.slice(0, 8);
  while ((s.length + 8) % 64) s += "\x00";

  let m = new Uint8Array(s.length + 8);
  for (let i = 0; i < s.length; i++) m[i] = s.charCodeAt(i);

  let b2 = cadena.length * 8;
  for (let i = 0; i < 4; i++) {
    m[m.length - 1 - i] = (b2 >>> (i * 8)) & 255;
  }

  for (let o = 0; o < m.length; o += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      let s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      let s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, c, d, e, f, g, k] = h.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      let s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      let ch = (e & f) ^ (~e & g);
      let t1 = (h[7] + s1 + ch + chk[8 + i] + w[i]) | 0;
      let s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      let maj = (a & c) ^ (a & d) ^ (c & d);
      let t2 = (s0 + maj) | 0;
      h = [(t1 + t2) | 0, a, c, d, (e + t1) | 0, f, g, k];
      [a, c, d, e, f, g, k] = h;
    }
    for (let i = 0; i < 8; i++) h[i] = (h[i] + h[i]) | 0;
  }

  return Array.from(h)
    .map((x) => (x >>> 0).toString(16).padStart(8, "0"))
    .join("");
}
async function procesarAutenticacion(e) {
  e.preventDefault();
  sessionStorage.removeItem("usuarioActivo");
  const txtMensaje = document.getElementById("mensaje");
  if (!txtMensaje) return;
  txtMensaje.textContent = "";
  txtMensaje.style.color = "";

  const inputUsuario = document.getElementById("usuario");
  const inputClave = document.getElementById("password");
  const contenedorForm = document.getElementById("loginForm");
  const btnSubmit = contenedorForm ? contenedorForm.querySelector('button[type="submit"]') : null;
  const textoOriginalBoton = btnSubmit ? btnSubmit.textContent : "Ingresar al Sistema";
  const dniIngresado = inputUsuario ? inputUsuario.value.trim() : "";
  const claveIngresada = inputClave ? inputClave.value : "";

  if (!dniIngresado || !claveIngresada) {
    mostrarAlertaUI(txtMensaje, "Por favor, complete todos los campos requeridos.", "#dc2626");
    return;
  }

  if (inputUsuario) inputUsuario.disabled = true;
  if (inputClave) inputClave.disabled = true;
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Ingresando...";
  }

  mostrarAlertaUI(txtMensaje, "Revisando acceso...", "#1a73e8");

  let docSnapshot = null;
  const maxIntentos = 3;
  let intentoActual = 0;
  let exitoConexion = false;

  while (intentoActual < maxIntentos && !exitoConexion) {
    try {
      intentoActual++;
      if (intentoActual > 1) {
        mostrarAlertaUI(
          txtMensaje,
          `Señal inestable. Reintentando conexión (Intento ${intentoActual}/${maxIntentos})...`,
          "#d97706"
        );
      }

      const docRef = doc(db, "usuarios", dniIngresado);
      docSnapshot = await getDoc(docRef);
      exitoConexion = true;

      if (docSnapshot.exists()) {
        if (typeof window.actualizarContadoresMonitor === "function") {
          window.actualizarContadoresMonitor("firebase_lectura", 1);
        } else {
          const fbLecturasActuales = parseInt(localStorage.getItem("haspen_monitor_firebase_lectura")) || 0;
          localStorage.setItem("haspen_monitor_firebase_lectura", String(fbLecturasActuales + 1));

          try {
            const { dbTelemetria } = await import("./firebase-config.js");
            const { collection, addDoc, serverTimestamp } = await import("https://gstatic.com");

            const datosUsuarioLogueado = docSnapshot.data();

            await addDoc(collection(dbTelemetria, "telemetria_haspen"), {
              dniUsuario: String(dniIngresado).trim(),
              nombreUsuario: datosUsuarioLogueado.nombre || "Usuario Autenticado",
              rolUsuario: datosUsuarioLogueado.rol || "Sin Rol",
              origen: "firebase_lectura",
              cantidad: 1,
              fechaImpacto: serverTimestamp()
            });
          } catch (errTelemetria) {
            console.warn("Reporte de inicio de sesión retenido de forma segura:", errTelemetria);
          }
        }
      }
    } catch (errorConexion) {
      console.warn(`Fallo el intento de conexión ${intentoActual}:`, errorConexion.message);
      if (intentoActual >= maxIntentos) {
        throw errorConexion;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  try {
    if (!docSnapshot || !docSnapshot.exists()) {
      mostrarAlertaUI(txtMensaje, "Credenciales inválidas. Verifique el DNI y la contraseña.", "#dc2626");
      if (inputUsuario) inputUsuario.disabled = false;
      if (inputClave) inputClave.disabled = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginalBoton;
      }
      return;
    }

    const datosDb = docSnapshot.data();
    const emailReal = datosDb.email;

    if (!emailReal || emailReal.trim() === "") {
      mostrarAlertaUI(
        txtMensaje,
        "El usuario no posee un correo electrónico real asociado en la base de datos.",
        "#dc2626"
      );
      if (inputUsuario) inputUsuario.disabled = false;
      if (inputClave) inputClave.disabled = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginalBoton;
      }
      return;
    }

    const claveDbFirestore = datosDb.clave;
    const hashDeClaveIngresada = await generarHashSHA256(claveIngresada);

    if (claveDbFirestore && claveDbFirestore.length === 64) {
      if (claveDbFirestore !== hashDeClaveIngresada) {
        mostrarAlertaUI(txtMensaje, "Credenciales inválidas. Verifique el DNI y la contraseña.", "#dc2626");
        if (inputUsuario) inputUsuario.disabled = false;
        if (inputClave) inputClave.disabled = false;
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = textoOriginalBoton;
        }
        return;
      }
    } else {
      if (claveDbFirestore !== claveIngresada) {
        mostrarAlertaUI(txtMensaje, "Credenciales inválidas. Verifique el DNI y la contraseña.", "#dc2626");
        if (inputUsuario) inputUsuario.disabled = false;
        if (inputClave) inputClave.disabled = false;
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = textoOriginalBoton;
        }
        return;
      }
    }

    let user = { displayName: datosDb.nombre || "Personal Haspen" };
    try {
      const credenciales = await signInWithEmailAndPassword(auth, emailReal, claveIngresada);
      user = credenciales.user;
    } catch (authError) {
      console.warn("Validacion local Firestore aprobada. Google Auth desalineado:", authError.code);
    }

    let matrizPermisosRol = {
      configuracionUsuarios: "ninguno",
      planesEstudio: "ninguno",
      legajoDigital: "ninguno",
      libroCalificaciones: "ninguno",
      controlPrevias: "ninguno",
      reportesEstadisticas: "ninguno",
      inclusionPpi: "ninguno"
    };
    try {
      const idRolUsuario = datosDb.rol ? datosDb.rol.toLowerCase().trim() : "sin-rol-asignado";
      const rolSnapshot = await getDoc(doc(db, "roles", idRolUsuario));
      if (rolSnapshot.exists()) {
        matrizPermisosRol = rolSnapshot.data().permisos || matrizPermisosRol;
      }
    } catch (errorRol) {
      console.error("Error en la sincronización del escudo de seguridad RBAC:", errorRol);
    }

    let perfilUsuario = {
      nombre: datosDb.nombre || user.displayName || "Personal Haspen",
      rol: datosDb.rol ? datosDb.rol.toLowerCase().trim() : "sin-rol-assigned",
      dni: dniIngresado,
      esProfesor: datosDb.esProfesor || false,
      bolsaHoras: datosDb.bolsaHoras || [],
      permisoGestionPeriodos: datosDb.permisoGestionPeriodos === true || datosDb.permisoGestionPeriodos === "true",
      permiteCargaTotalNotas: datosDb.permiteCargaTotalNotas === true || datosDb.permiteCargaTotalNotas === "true",
      permisosDelRol: matrizPermisosRol
    };

    sessionStorage.setItem("usuarioActivo", JSON.stringify(perfilUsuario));

    mostrarAlertaUI(txtMensaje, "Acceso concedido. Redireccionando...", "#0d9488");
    setTimeout(() => {
      window.location.href = "panel.html";
    }, 800);
  } catch (error) {
    console.error("Error en el proceso de logueo asíncrono:", error);
    if (inputUsuario) inputUsuario.disabled = false;
    if (inputClave) inputClave.disabled = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = textoOriginalBoton;
    }

    const msgError = error.message || "";
    if (msgError.includes("offline") || msgError.includes("network") || msgError.includes("Failed to get")) {
      mostrarAlertaUI(
        txtMensaje,
        "⚠️ No se pudo conectar con el servidor. Por favor, verifique el Wi-Fi e intente nuevamente.",
        "#dc2626"
      );
    } else {
      mostrarAlertaUI(txtMensaje, "Error al iniciar sesión: " + msgError, "#dc2626");
    }
  }
}
async function procesarRecuperacionEnCaliente() {
  const txtModalMensaje = document.getElementById("modal-mensaje");
  if (!txtModalMensaje) return;
  txtModalMensaje.textContent = "";
  txtModalMensaje.style.color = "";

  const inputModalDni = document.getElementById("modal-dni");
  const btnVerificarModal = document.getElementById("btn-consultar-modal");
  const textoOriginalBoton = btnVerificarModal ? btnVerificarModal.textContent : "Verificar DNI";

  const dniAVerificar = inputModalDni ? inputModalDni.value.trim() : "";

  if (!dniAVerificar) {
    mostrarAlertaUI(txtModalMensaje, "Debe ingresar un número de DNI válido.", "#dc2626");
    return;
  }

  if (inputModalDni) inputModalDni.disabled = true;
  if (btnVerificarModal) {
    btnVerificarModal.disabled = true;
    btnVerificarModal.textContent = "Verificando...";
  }

  try {
    const docRef = doc(db, "usuarios", dniAVerificar);
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
      mostrarAlertaUI(txtModalMensaje, "El DNI ingresado no corresponde a ningún operador registrado.", "#dc2626");

      if (inputModalDni) inputModalDni.disabled = false;
      if (btnVerificarModal) {
        btnVerificarModal.disabled = false;
        btnVerificarModal.textContent = textoOriginalBoton;
      }
      return;
    }

    const datosUsuario = docSnapshot.data();
    const emailReal = datosUsuario.email;

    if (!emailReal || emailReal.trim() === "") {
      mostrarAlertaUI(
        txtModalMensaje,
        "Este usuario no cuenta con un correo real válido registrado para la recuperación.",
        "#dc2626"
      );

      if (inputModalDni) inputModalDni.disabled = false;
      if (btnVerificarModal) {
        btnVerificarModal.disabled = false;
        btnVerificarModal.textContent = textoOriginalBoton;
      }
      return;
    }

    auth.languageCode = "es";
    await sendPasswordResetEmail(auth, emailReal);

    mostrarAlertaUI(
      txtModalMensaje,
      "Si el DNI es correcto, se ha enviado un enlace de restauración al correo real registrado en el sistema. Revise su bandeja de entrada y correo no deseado.",
      "#0d9488"
    );

    if (btnVerificarModal) {
      btnVerificarModal.textContent = "Enviado";
    }
  } catch (error) {
    console.error("Error al recuperar credenciales Firebase:", error);

    if (inputModalDni) inputModalDni.disabled = false;
    if (btnVerificarModal) {
      btnVerificarModal.disabled = false;
      btnVerificarModal.textContent = textoOriginalBoton;
    }

    let msg = "No se pudo procesar la solicitud en este momento.";
    if (error.code === "auth/user-not-found") {
      msg = "El correo de este operador no se encuentra registrado en el sistema de autenticación.";
    } else if (error.code === "auth/network-request-failed") {
      msg = "Error de conexión. Verifique su acceso a internet.";
    }
    mostrarAlertaUI(txtModalMensaje, msg, "#dc2626");
  }
}

function abrirModalRecuperacion(e) {
  e.preventDefault();
  const inputDni = document.getElementById("modal-dni");
  const msgModal = document.getElementById("modal-mensaje");
  if (inputDni) inputDni.value = "";
  if (msgModal) msgModal.textContent = "";

  const divModal = document.getElementById("modalRecuperar");
  if (divModal) divModal.classList.add("mostrar-modal");
}

function cerrarModalRecuperacion() {
  const divModal = document.getElementById("modalRecuperar");
  if (divModal) divModal.classList.remove("mostrar-modal");
}

const formLogin = document.getElementById("loginForm");
if (formLogin) {
  formLogin.addEventListener("submit", procesarAutenticacion);
}

const btnOlvido = document.getElementById("olvido-pass");
if (btnOlvido) {
  btnOlvido.addEventListener("click", abrirModalRecuperacion);
}

const btnCancelar = document.getElementById("btn-cancelar-modal");
if (btnCancelar) {
  btnCancelar.addEventListener("click", cerrarModalRecuperacion);
}

const btnVerificarModal = document.getElementById("btn-consultar-modal");
if (btnVerificarModal) {
  btnVerificarModal.addEventListener("click", procesarRecuperacionEnCaliente);
}

const inputModalDni = document.getElementById("modal-dni");
if (inputModalDni) {
  inputModalDni.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      procesarRecuperacionEnCaliente();
    }
  });
}

function mostrarAlertaUI(contenedor, mensajeText, colorHex) {
  contenedor.textContent = mensajeText;
  contenedor.style.color = colorHex;
}
