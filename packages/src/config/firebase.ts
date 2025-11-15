// firebase.ts
import {initializeApp} from "firebase/app";
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {connectAuthEmulator, getAuth} from 'firebase/auth';

// Usamos compat SOLO para Functions, para poder usar useEmulator sin pelear con los types
import 'firebase/compat/functions';
import firebaseCompat from 'firebase/compat/app';

// Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyCo_eMk6NrQEqMB757fgU3FpMjLwBhfI9w",
    authDomain: "viajes-ead.firebaseapp.com",
    projectId: "viajes-ead",
    storageBucket: "viajes-ead.firebasestorage.app",
    messagingSenderId: "211543185187",
    appId: "1:211543185187:web:16c8dfa8aec492cee1de96",
    measurementId: "G-DTL2C48CB5"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

// Functions vía compat (usa la misma app debajo)
const compatApp = firebaseCompat.apps.length
    ? firebaseCompat.app()
    : firebaseCompat.initializeApp(firebaseConfig);
const functions = compatApp.functions();

// ---- EMULADORES ----
const useEmulators = true
    //process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

if (useEmulators) {
    const host = 'localhost'
        //process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || window.location.hostname;

    const firestorePort = 8080
        //Number(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT ?? '8080');
    const authPort = 9099
        //Number(process.env.EXPO_PUBLIC_AUTH_EMULATOR_PORT ?? '9099');
    const functionsPort = 5001
        //Number(process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT ?? '5001');

    connectFirestoreEmulator(db, host, firestorePort);
    connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true });
    functions.useEmulator(host, functionsPort);
}

// Exportar servicios para usar en la app
export { app, db, auth, functions };
