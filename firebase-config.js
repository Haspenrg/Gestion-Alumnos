import { initializeApp } from "https://gstatic.com";
import { getFirestore } from "https://gstatic.com";
// Agregamos la librería de autenticación de Firebase
import { getAuth } from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyBP3ihDEsCnQSABsxEDDR4RNZiM06MJyvo",
  authDomain: "://firebaseapp.com",
  projectId: "gestion-alumnos-eeb24",
  storageBucket: "gestion-alumnos-eeb24.firebasestorage.app",
  messagingSenderId: "824391106851",
  appId: "1:824391106851:web:d8fdc7f37351bedc034c96"
};

const app = initializeApp(firebaseConfig);

// Exportamos ambos servicios para usarlos en todo el sistema
export const db = getFirestore(app);
export const auth = getAuth(app);
