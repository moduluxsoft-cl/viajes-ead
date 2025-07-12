"use strict";
// functions/src/index.ts
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.testUpdateTravelDate = exports.updateTravelDateWeekly = void 0;
const firebase_functions_1 = require("firebase-functions");
// Start writing functions
// https://firebase.google.com/docs/functions/typescript
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
const scheduler_1 = require("firebase-functions/scheduler");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("firebase-admin");
var Timestamp = firebase_admin_1.firestore.Timestamp;
const https_1 = require("firebase-functions/https");
const https_2 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
exports.updateTravelDateWeekly = (0, scheduler_1.onSchedule)({
    schedule: '0 16 * * *',
    timeZone: 'America/Santiago',
}, async (event) => {
    console.log("Actualizando fecha de viaje.");
    await updateTravelDate('testUpdateTravelDate').then(() => {
        console.log("Fecha de viaje actualizada exitosamente.");
    }).catch((error) => {
        console.error('Error actualizando documentos:', error);
    });
});
exports.testUpdateTravelDate = (0, https_1.onRequest)(async (req, res) => {
    await updateTravelDate('testUpdateTravelDate').then(() => {
        res.status(200).json({
            message: "Fecha de viaje actualizada exitosamente",
            timestamp: new Date().toISOString()
        });
    }).catch((error) => {
        console.error('Error en prueba:', error);
        res.status(500).json({ error: "Error en prueba" });
    });
});
async function updateTravelDate(callerName) {
    const db = (0, firestore_1.getFirestore)();
    const propertiesCollection = db.collection('properties');
    const querySnapshot = await propertiesCollection.where('name', '==', 'DATE_TRAVEL').get();
    if (querySnapshot.empty) {
        console.log('No se encontró el documento con name = "DATE_TRAVEL"');
        throw new Error("Documento \"DATE_TRAVEL\" no encontrado.");
    }
    if (querySnapshot.size > 1) {
        console.log('Se encontraron varios documentos con name = "DATE_TRAVEL"');
        throw new Error("Se encontraron varios documentos con name = \"DATE_TRAVEL\".");
    }
    const travelDateDoc = querySnapshot.docs[0];
    console.log(`Documento de fecha de viaje, con id = "${travelDateDoc.id}" encontrado.`);
    const actualTravelTimestamp = travelDateDoc.data().value;
    const actualTravelDate = actualTravelTimestamp.toDate();
    //Agregar una semana
    const updatedTravelDate = new Date(actualTravelDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Quitar los segundos (establecer segundos y milisegundos a 0)
    updatedTravelDate.setHours(12, 0, 0, 0);
    await travelDateDoc.ref.update({
        value: updatedTravelDate,
        lastUpdated: Timestamp.now(),
        updatedBy: 'updateTravelDate',
        executedBy: callerName
    }).then(() => {
        return;
    }).catch((error) => {
        console.error(error.message);
        throw error;
    });
}
/**
 * Cloud Function para eliminar un usuario de Firebase Auth y de Firestore.
 * Solo puede ser llamada por un usuario autenticado con el rol de 'admin'.
 * Se invoca desde la app con httpsCallable.
 */
exports.deleteUser = (0, https_2.onCall)({ region: "us-central1" }, async (request) => {
    var _a, _b;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== "admin") {
        throw new https_2.HttpsError("permission-denied", "Solo los administradores pueden eliminar usuarios.");
    }
    // Los datos enviados desde la app están en request.data
    const uid = request.data.uid;
    if (!uid) {
        throw new https_2.HttpsError("invalid-argument", "El UID del usuario es requerido.");
    }
    try {
        // 2. Eliminar el usuario de Firebase Authentication
        await (0, auth_1.getAuth)().deleteUser(uid);
        // 3. Eliminar el documento del usuario en Firestore
        await db.collection("users").doc(uid).delete();
        console.log(`Usuario ${uid} eliminado exitosamente por ${(_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid}`);
        return { success: true, message: "Usuario eliminado correctamente." };
    }
    catch (error) {
        console.error("Error al eliminar usuario:", error);
        if (error instanceof https_2.HttpsError) {
            throw error; // Re-lanzar errores HttpsError
        }
        if (error instanceof Error) {
            throw new https_2.HttpsError("internal", error.message);
        }
        throw new https_2.HttpsError("internal", "Ocurrió un error inesperado al eliminar el usuario.");
    }
});
//# sourceMappingURL=index.js.map