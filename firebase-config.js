'use strict';

const b = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';

const mApp  = await import(b + 'firebase-app.js');
const mStore = await import(b + 'firebase-firestore.js');
const mAuth  = await import(b + 'firebase-auth.js');

const firebaseConfig = {
    apiKey:            "AIzaSyBP3iHdEsCnQSABsxEDDR4RNZ1M06MJyvo",
    authDomain:        "gestion-alumnos-eeb24.firebaseapp.com",
    projectId:         "gestion-alumnos-eeb24",
    storageBucket:     "gestion-alumnos-eeb24.firebasestorage.app",
    messagingSenderId: "824391106851",
    appId:             "1:824391106851:web:d8fdc7f37351bedc034c96"
};

const app = mApp.initializeApp(firebaseConfig);

export const db   = mStore.getFirestore(app);
export const auth = mAuth.getAuth(app);