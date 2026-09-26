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

const mApp = await import(b + "firebase-app.js");
const mStore = await import(b + "firebase-firestore.js");
const mAuth = await import(b + "firebase-auth.js");

// 1. CONFIGURACIÓN PRINCIPAL DE LA ESCUELA (BASE A)
const firebaseConfig = {
  apiKey: "AIzaSyBP3iHdEsCnQSABsxEDDR4RNZ1M06MJyvo",
  authDomain: "://firebaseapp.com",
  projectId: "gestion-alumnos-eeb24",
  storageBucket: "gestion-alumnos-eeb24.firebasestorage.app",
  messagingSenderId: "824391106851",
  appId: "1:824391106851:web:d8fdc7f37351bedc034c96"
};

// 2. CONFIGURACIÓN DE LA NUEVA BASE DE AUDITORÍA/TELEMETRÍA (BASE B)
// REEMPLAZÁ estos valores de ejemplo por las llaves que tenés en la pantalla del navegador
const telemetriaConfig = {
  apiKey: "AIzaSyA6BoTq4vUBAgQo3vCKT2i1kv3syLOTd9s",
  authDomain: "haspen-telemetria.firebaseapp.com",
  projectId: "haspen-telemetria",
  storageBucket: "haspen-telemetria.firebasestorage.app",
  messagingSenderId: "662239561822",
  appId: "1:662239561822:web:18246dee6cd29f0294cccf"
};

// Inicialización de la App de la Escuela
const app = mApp.initializeApp(firebaseConfig);

// Inicialización de la App de Telemetría (Se le pasa un nombre único de control interno)
const appTelemetria = mApp.initializeApp(telemetriaConfig, "telemetriaApp");

// Exportación de la Base de la Escuela (Mantiene tu motor de persistencia intacto)
export const db = mStore.initializeFirestore(app, {
  localCache: mStore.persistentLocalCache({
    tabManager: mStore.persistentMultipleTabManager()
  })
});

// Exportación de la Base de Telemetría (Limpia y directa a la nube para tiempo real)
export const dbTelemetria = mStore.getFirestore(appTelemetria);

export const auth = mAuth.getAuth(app);
