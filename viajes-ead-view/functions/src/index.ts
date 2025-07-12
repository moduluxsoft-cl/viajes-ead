// functions/src/index.ts
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";

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
setGlobalOptions({ maxInstances: 10 });

import {onSchedule} from "firebase-functions/scheduler";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {firestore} from "firebase-admin";
import Timestamp = firestore.Timestamp;
import {onRequest} from "firebase-functions/https";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getAuth} from "firebase-admin/auth";

initializeApp();
const db = getFirestore();

export const updateTravelDateWeekly = onSchedule(
    {
        schedule: '0 16 * * *',
        timeZone: 'America/Santiago',
    },
    async (event) => {
        console.log("Actualizando fecha de viaje.")
        await updateTravelDate('testUpdateTravelDate').then(() => {
            console.log("Fecha de viaje actualizada exitosamente.");
        }).catch((error: Error) => {
            console.error('Error actualizando documentos:', error);
        });
    }
);

export const testUpdateTravelDate = onRequest(async (req, res) => {
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

async function updateTravelDate(callerName: String) {
    const db = getFirestore();
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

    const actualTravelTimestamp = travelDateDoc.data().value as Timestamp;
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
    }).catch((error: Error) => {
        console.error(error.message);
        throw error;
    })
}

/**
 * Cloud Function para eliminar un usuario de Firebase Auth y de Firestore.
 * Solo puede ser llamada por un usuario autenticado con el rol de 'admin'.
 * Se invoca desde la app con httpsCallable.
 */
export const deleteUser = onCall({ region: "us-central1" }, async (request) => {
    if (request.auth?.token.role !== "admin") {
        throw new HttpsError(
            "permission-denied",
            "Solo los administradores pueden eliminar usuarios."
        );
    }

    // Los datos enviados desde la app están en request.data
    const uid = request.data.uid;
    if (!uid) {
        throw new HttpsError(
            "invalid-argument",
            "El UID del usuario es requerido."
        );
    }

    try {
        // 2. Eliminar el usuario de Firebase Authentication
        await getAuth().deleteUser(uid);

        // 3. Eliminar el documento del usuario en Firestore
        await db.collection("users").doc(uid).delete();

        console.log(`Usuario ${uid} eliminado exitosamente por ${request.auth?.uid}`);
        return { success: true, message: "Usuario eliminado correctamente." };

    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        if (error instanceof HttpsError) {
            throw error; // Re-lanzar errores HttpsError
        }
        if (error instanceof Error) {
            throw new HttpsError("internal", error.message);
        }
        throw new HttpsError("internal", "Ocurrió un error inesperado al eliminar el usuario.");
    }
});
