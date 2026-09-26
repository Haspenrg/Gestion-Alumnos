"use strict";

// Configuración de la base de Firebase emulando el bypass de soporte.js
const base =
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

// IMPORTANTE: Importamos la base de telemetría secundaria (0 gasto para la escuela)
const { dbTelemetria } = await import("./firebase-config.js");
const { collection, getDocs, query, where } = await import(base + "firebase-firestore.js");

// Elementos de la interfaz visual
const elLocalLecturas = document.getElementById("metrica-local-lecturas");
const elLocalEscrituras = document.getElementById("metrica-local-escrituras");
const elFirebaseLecturas = document.getElementById("metrica-firebase-lecturas");
const elFirebaseEscrituras = document.getElementById("metrica-firebase-escrituras");
const elTxtEstado = document.getElementById("txt-estado-monitor");
const btnActualizar = document.getElementById("btn-actualizar-metrics");
let consultasManualesAdmin = 0;

// Función principal para traer las métricas en tiempo real global
async function consultarMetricasNube() {
  try {
    if (btnActualizar) btnActualizar.disabled = true;
    if (elTxtEstado) elTxtEstado.innerText = "Consultando base de auditoría central...";

    // ====== SINCRONISMO FIEL CON EL RELOJ DE GOOGLE (UTC) ======
    // Forzamos el inicio del día a las 00:00:00 UTC del servidor central (21:00 hs de ayer local)
    const ahora = new Date();
    const corteHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 21, 0, 0, 0);
    let inicioDiaGoogleUTC;

    if (ahora >= corteHoy) {
      const mañana = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
      inicioDiaGoogleUTC = new Date(Date.UTC(mañana.getFullYear(), mañana.getMonth(), mañana.getDate(), 0, 0, 0, 0));
    } else {
      inicioDiaGoogleUTC = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0));
    }

    // CONSULTA DIRECTA A LA BASE DE TELEMETRÍA SECUNDARIA
    const q = query(collection(dbTelemetria, "telemetria_haspen"), where("fechaImpacto", ">=", inicioDiaGoogleUTC));
    const snapshot = await getDocs(q);

    // Inicializamos los 4 contadores clave
    consultasManualesAdmin++;
    let localLecturas = 0;
    let localEscrituras = 0;
    let firebaseLecturas = consultasManualesAdmin;
    let firebaseEscrituras = 0;

    // Procesamos quirúrgicamente los documentos globales del día que están en la nube
    snapshot.forEach((docSnap) => {
      const datos = docSnap.data();
      const cantidad = parseInt(datos.cantidad) || 1;
      const origen = datos.origen ? datos.origen.toLowerCase().trim() : "";

      // Clasificación exacta basada en la telemetría institucional extendida
      if (origen === "local_lectura" || origen === "local") {
        localLecturas += cantidad;
      } else if (origen === "local_escritura") {
        localEscrituras += cantidad;
      } else if (origen === "firebase_lectura" || origen === "firebase") {
        firebaseLecturas += cantidad;
      } else if (origen === "firebase_escritura") {
        firebaseEscrituras += cantidad;
      }
    });

    // Levanta de forma segura el acumulado en disco de la terminal actual
    const localLecturasCache = parseInt(localStorage.getItem("haspen_monitor_local_lectura")) || 0;
    const localEscriturasCache = parseInt(localStorage.getItem("haspen_monitor_local_escritura")) || 0;
    const firebaseLecturasCache = parseInt(localStorage.getItem("haspen_monitor_firebase_lectura")) || 0;
    const firebaseEscriturasCache = parseInt(localStorage.getItem("haspen_monitor_firebase_escritura")) || 0;

    // Sincronización híbrida: compara la RAM global (nube) con el disco y deja el valor más alto
    if (elLocalLecturas) elLocalLecturas.innerText = Math.max(localLecturas, localLecturasCache);
    if (elLocalEscrituras) elLocalEscrituras.innerText = Math.max(localEscrituras, localEscriturasCache);
    if (elFirebaseLecturas) elFirebaseLecturas.innerText = Math.max(firebaseLecturas, firebaseLecturasCache);
    if (elFirebaseEscrituras) elFirebaseEscrituras.innerText = Math.max(firebaseEscrituras, firebaseEscriturasCache);

    // Formateamos la hora del último congelamiento para control del Admin
    const h = ahora.getHours().toString().padStart(2, "0");
    const m = ahora.getMinutes().toString().padStart(2, "0");
    if (elTxtEstado) elTxtEstado.innerText = `Estado: Sincronizado. Última consulta: ${h}:${m} hs.`;
  } catch (error) {
    console.error("Error al actualizar el monitor:", error);
    if (elTxtEstado) elTxtEstado.innerText = "Error de red al conectar con la base de telemetría.";
  } finally {
    if (btnActualizar) btnActualizar.disabled = false;
  }
}

// Escuchador manual para romper el congelamiento a discreción del Administrador
if (btnActualizar) {
  btnActualizar.addEventListener("click", consultarMetricasNube);
}

// Carga inicial automatizada de puesta a punto al abrir la ventana
consultarMetricasNube();
