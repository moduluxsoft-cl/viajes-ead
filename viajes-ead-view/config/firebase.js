import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import {
    getAuth,
    browserLocalPersistence,
    setPersistence
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCo_eMk6NrQEqMB757fgU3FpMjLwBhfI9w",
    authDomain: "viajes-ead.firebaseapp.com",
    projectId: "viajes-ead",
    storageBucket: "viajes-ead.firebasestorage.app",
    messagingSenderId: "211543185187",
    appId: "1:211543185187:web:16c8dfa8aec492cee1de96",
    measurementId: "G-DTL2C48CB5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

// Inicializar Auth con persistencia en el dispositivo
const auth = getAuth(app);
// Configurar persistencia local
setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
        console.error("Error setting persistence:", error);
    });

// Exportar servicios para usar en la app
export { auth, db };
