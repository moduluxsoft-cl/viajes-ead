const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

export default {
    expo: {
        name: "viajes-ead",
        slug: "viajes-ead",
        scheme: "viajes-ead",
        version: "1.0.0",
        orientation: "portrait",
        icon: "assets/images/favicon.png",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        extra: {
            useFirebaseEmulators: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS,
            firebaseEmulatorHost: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
            firestoreEmulatorPort: process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT,
            authEmulatorPort: process.env.EXPO_PUBLIC_AUTH_EMULATOR_PORT,
            pubsubEmulatorPort: process.env.EXPO_PUBLIC_PUBSUB_EMULATOR_PORT,
            functionsEmulatorPort: process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT,
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "assets/images/favicon.png",
            build: {
                babel: {
                    "include": ["@expo/vector-icons"]
                }
            }
        },
        plugins: [
            "expo-router",
            [
                "expo-camera",
                {
                    cameraPermission: "La aplicación necesita acceso a la cámara para escanear los códigos QR de los pases de viaje."
                }
            ],
            "expo-web-browser"
        ],
        experiments: {
            "typedRoutes": true
        }
    }
}
