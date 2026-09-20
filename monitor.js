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

// Importamos la base de datos local y las herramientas quirúrgicas de Firestore
const { db } = await import("./firebase-config.js");
const { collection, getDocs, query, where } = await import(base + "firebase-firestore.js");

// Elementos de la interfaz visual
const elLocalLecturas = document.getElementById("metrica-local-lecturas");
const elLocalEscrituras = document.getElementById("metrica-local-escrituras");
const elFirebaseLecturas = document.getElementById("metrica-firebase-lecturas");
const elFirebaseEscrituras = document.getElementById("metrica-firebase-escrituras");
const elTxtEstado = document.getElementById("txt-estado-monitor");
const btnActualizar = document.getElementById("btn-actualizar-metrics");

// Función principal para traer las métricas de forma pasiva (Por Demanda)
async function consultarMetricasNube() {
  try {
    if (btnActualizar) btnActualizar.disabled = true;
    if (elTxtEstado) elTxtEstado.innerText = "Consultando base central de Firebase...";

    // ====== SINCRONISMO FIEL CON EL RELOJ DE GOOGLE (UTC) ======
    // Forzamos el inicio del día a las 00:00:00 UTC del servidor central (21:00 hs de ayer local)
    const ahora = new Date();
    const inicioDiaGoogleUTC = new Date(
      Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), 0, 0, 0, 0)
    );

    // Consulta directa de un solo golpe (getDocs) sin mantener conexiones vivas
    const q = query(collection(db, "telemetria_haspen"), where("fechaImpacto", ">=", inicioDiaGoogleUTC));
    const snapshot = await getDocs(q);

    // Inicializamos los 4 contadores clave
    let localLecturas = 0;
    let localEscrituras = 0;
    let firebaseLecturas = 0;
    let firebaseEscrituras = 0;

    // Procesamos quirúrgicamente los documentos del día
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

    // Inyectamos los resultados en la interfaz
    if (elLocalLecturas) elLocalLecturas.innerText = localLecturas;
    if (elLocalEscrituras) elLocalEscrituras.innerText = localEscrituras;
    if (elFirebaseLecturas) elFirebaseLecturas.innerText = firebaseLecturas;
    if (elFirebaseEscrituras) elFirebaseEscrituras.innerText = firebaseEscrituras;

    // Formateamos la hora del último congelamiento para control del Admin
    const h = ahora.getHours().toString().padStart(2, "0");
    const m = ahora.getMinutes().toString().padStart(2, "0");
    if (elTxtEstado) elTxtEstado.innerText = `Estado: Congelado. Última consulta: ${h}:${m} hs.`;
  } catch (error) {
    console.error("Error al actualizar el monitor:", error);
    if (elTxtEstado) elTxtEstado.innerText = "Error de red al conectar con Firebase.";
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
