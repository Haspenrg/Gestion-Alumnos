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
    const ahora = new Date();
    const corteHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 21, 0, 0, 0);

    // Determinamos la marca del ciclo actual idéntica a soporte.js
    let marcaCicloActual =
      ahora >= corteHoy ? corteHoy.toDateString() : new Date(corteHoy.getTime() - 24 * 60 * 60 * 1000).toDateString();

    // Forzamos el inicio del día técnico en UTC de Google para la consulta de red
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

    consultasManualesAdmin++;
    let localLecturasNube = 0;
    let localEscriturasNube = 0;
    let firebaseLecturasNube = consultasManualesAdmin;
    let firebaseEscriturasNube = 0;

    // Procesamos quirúrgicamente los documentos globales del día que están en la nube espejo
    snapshot.forEach((docSnap) => {
      const datos = docSnap.data();
      const cantidad = parseInt(datos.cantidad) || 1;
      const origen = datos.origen ? datos.origen.toLowerCase().trim() : "";

      if (origen === "local_lectura" || origen === "local") {
        localLecturasNube += cantidad;
      } else if (origen === "local_escritura") {
        localEscriturasNube += cantidad;
      } else if (origen === "firebase_lectura" || origen === "firebase") {
        firebaseLecturasNube += cantidad;
      } else if (origen === "firebase_escritura") {
        firebaseEscriturasNube += cantidad;
      }
    });

    // ====== CONTROL DE REINICIO DE ADUANA LOCAL ======
    // Si la terminal cambió de ciclo, forzamos el reset local inmediato en el monitor
    const cacheKeyCiclo = `haspen_monitor_ciclo_fecha`;
    if (localStorage.getItem(cacheKeyCiclo) !== marcaCicloActual) {
      localStorage.setItem(cacheKeyCiclo, marcaCicloActual);
      localStorage.setItem("haspen_monitor_local_lectura", "0");
      localStorage.setItem("haspen_monitor_local_escritura", "0");
      localStorage.setItem("haspen_monitor_firebase_lectura", "0");
      localStorage.setItem("haspen_monitor_firebase_escritura", "0");
    }

    // Levantamos los acumulados en disco de la terminal actual
    const localLecturasCache = parseInt(localStorage.getItem("haspen_monitor_local_lectura")) || 0;
    const localEscriturasCache = parseInt(localStorage.getItem("haspen_monitor_local_escritura")) || 0;
    const firebaseLecturasCache = parseInt(localStorage.getItem("haspen_monitor_firebase_lectura")) || 0;
    const firebaseEscriturasCache = parseInt(localStorage.getItem("haspen_monitor_firebase_escritura")) || 0;

    // ====== BALANCEADOR HÍBRIDO ADUANA LOCAL (EVITA CONGELAMIENTO HISTÓRICO) ======
    // Prioridad absoluta al contador vivo local de la sesión activa del día
    if (elLocalLecturas) elLocalLecturas.innerText = Math.max(localLecturasNube, localLecturasCache);
    if (elLocalEscrituras) elLocalEscrituras.innerText = Math.max(localEscriturasNube, localEscriturasCache);
    if (elFirebaseLecturas) elFirebaseLecturas.innerText = Math.max(firebaseLecturasNube, firebaseLecturasCache);
    if (elFirebaseEscrituras)
      elFirebaseEscrituras.innerText = Math.max(firebaseEscriturasNube, firebaseEscriturasCache);

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
