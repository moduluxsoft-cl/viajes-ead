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
        schedule: '0 0 * * 4',
        timeZone: 'America/Santiago',
    },
    async (event) => {
        await updateTravelDate();
    }
);

export const testUpdateTravelDate = onRequest(async (req, res) => {
    try {
        await updateTravelDate();
        res.status(200).json({
            message: "Fecha de viaje actualizada exitosamente",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en prueba:', error);
        res.status(500).json({ error: "Error en prueba" });
    }
});


async function updateTravelDate() {
    try {
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
        console.log(`Docuemnto con id = "${travelDateDoc.id}" encontrado.`);

        const today = new Date();
        const todayTimestamp = Timestamp.fromDate(today);

        await travelDateDoc.ref.update({
            value: todayTimestamp,
            lastUpdated: Timestamp.now(),
            updatedBy: 'scheduled_function'
        }).then(() => {
            console.log(`Documento actualizado correctamente.`);

            return {
                success: true,
                documentId: travelDateDoc.id,
                newDate: today.toISOString(),
                message: 'Fecha de viaje actualizada exitosamente'
            };

        }).catch((error) => {
            console.error(error.message);

            return {
                success: false,
                documentId: travelDateDoc.id,
                newDate: today.toISOString(),
                message: error.message
            };
        })
    } catch (error) {
        console.error('Error actualizando documentos:', error);
    }
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
