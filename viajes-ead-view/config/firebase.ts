// firebase.ts
import {initializeApp, setLogLevel} from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import {
    getAuth,
    initializeAuth,
    ReactNativePersistence,
    Auth
} from 'firebase/auth';
import {Platform} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
if (__DEV__) {
    setLogLevel("debug");   // 🔊 Muestra cada request/respuesta del SDK
}
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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

// Inicializar Auth con persistencia en el dispositivo
let auth: Auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    auth = initializeAuth(app, {
        persistence: ReactNativePersistence(AsyncStorage)
    });
}

// Exportar servicios para usar en la app
export { auth, db };
