import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// Firebase configuration (same as main)
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

// Always connect to emulators for this test config
const host = 'localhost';
const firestorePort = 8080;
const authPort = 9099;

console.log(`🔧 TEST CONFIG: Connecting to Firebase Emulators in ${host}`);
connectFirestoreEmulator(db, host, firestorePort);
connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true });

export { app, auth, db };

