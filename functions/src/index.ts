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
import firebase = require("firebase-admin");
import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
import DocumentData = firebase.firestore.DocumentData;
import * as nodemailer from 'nodemailer';
import QRCode from "qrcode";
import {google} from "googleapis";

initializeApp();
const db = getFirestore();

// Configuración de OAuth2
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const USER_EMAIL = process.env.USER_EMAIL;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";

export const enviarCorreoConQR = onCall(async (request) => {
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    console.log("enviarCorreoConQR contenido: ",request.data)

    if (CLIENT_ID === undefined || CLIENT_SECRET === undefined || REFRESH_TOKEN === undefined || USER_EMAIL === undefined) {
        console.error("No se han configurado las credenciales de Gmail.")
    }

    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: USER_EMAIL,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: REFRESH_TOKEN,
            accessToken: accessToken.token || "",
        },
    });

    try {
        const { email, contenidoQR } = request.data;

        if (!email || !contenidoQR) {
            throw new HttpsError(
                "invalid-argument",
                "Se necesita un email y un contenidoQR"
            );
        }

        // Genera el QR en base64 (como imagen PNG)
        const qrDataUrl = await QRCode.toDataURL(contenidoQR);
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");

        // Prepara el email con el adjunto
        const mailOptions = {
            from: USER_EMAIL,
            to: email,
            subject: "Tu código QR solicitado",
            text: "Adjuntamos tu código QR.",
            attachments: [
                {
                    filename: "qr.png",
                    content: base64Data,
                    encoding: "base64"
                }
            ]
        };

        // Envía el email
        await transporter.sendMail(mailOptions);

        return { success: true };
    } catch (error) {
        console.error("Error al enviar el email:", error);
        return { success: false };
    }
});


export const updateTravelDateWeekly = onSchedule(
    {
        schedule: '0 0 * * 4',
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
    const propertiesCollection = db.collection('viajes');
    const querySnapshot = await propertiesCollection.where('STATE', '==', 'ABIERTO').get();

    if (querySnapshot.empty) {
        console.log('No se encontró el documento con STATE = "ABIERTO"');
        throw new Error("Documento con STATE = \"ABIERTO\" no encontrado.");
    }

    if (querySnapshot.size > 1) {
        console.log('Se encontraron varios documentos con STATE = "ABIERTO"');
        throw new Error("Se encontraron varios documentos con STATE = \"ABIERTO\".");
    }

    const travelDateDoc = querySnapshot.docs[0];
    console.log(`Documento de fecha de viaje, con id = "${travelDateDoc.id}" encontrado.`);

    const actualTravelTimestamp = travelDateDoc.data().DATE_TRAVEL as Timestamp;
    const actualTravelDate = actualTravelTimestamp.toDate();

    //Agregar una semana
    const updatedTravelDate = new Date(actualTravelDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Quitar los segundos (establecer segundos y milisegundos a 0)
    updatedTravelDate.setHours(12, 0, 0, 0);

    await travelDateDoc.ref.update({
        DATE_TRAVEL: updatedTravelDate,
    }).then(() => {
        return;
    }).catch((error: Error) => {
        console.error(error.message);
        throw error;
    })
}

export const deleteInactiveTravelsAndPasesWeekly = onSchedule(
    {
        schedule: '0 0 * * 4',
        timeZone: 'America/Santiago',
    },
    async (event) => {
        console.log("Eliminando documentos de viajes y pases inactivos.")
        await deleteInactiveTravelsAndPases().then(() => {
            console.log("Documentos eliminados exitosamente.");
        }).catch((error: Error) => {
            console.error('Error eliminando documentos:', error);
        });
    }
);

export const testDeleteInactiveTravelsAndPases = onRequest(async (req, res) => {
    await deleteInactiveTravelsAndPases().then(() => {
        res.status(200).json({
            message: "Documentos eliminados exitosamente.",
            timestamp: new Date().toISOString()
        });
    }).catch((error) => {
        console.error('Error en prueba:', error);
        res.status(500).json({ error: "Error en prueba" });
    });
});

async function deleteInactiveTravelsAndPases() {
    const db = getFirestore();
    const travelsCollection = db.collection('viajes');

    try {
        // Obtener todos los documentos de la colección "viajes"
        const travelsQuerySnapshot = await travelsCollection.get();

        if (travelsQuerySnapshot.empty) {
            console.log('No se encontraron viajes en la colección');
            return;
        }

        const batch = db.batch();
        let viajeAbiertoEncontrado = false;
        let docsToDelete: QueryDocumentSnapshot<DocumentData>[] = [];
        let activeTravelDoc: QueryDocumentSnapshot<DocumentData>;

        // Iterar sobre todos los documentos
        travelsQuerySnapshot.forEach((doc) => {
            const viajeData = doc.data();

            if (viajeData.STATE === 'ABIERTO') {
                if (viajeAbiertoEncontrado) {
                    // Si ya encontramos un viaje abierto, este duplicado se elimina
                    console.log(`Añadiendo viaje duplicado con estado ABIERTO a lista de borrados: ${doc.id}`);
                    docsToDelete.push(doc);
                } else {
                    // Primer viaje con estado ABIERTO, lo conservamos
                    console.log(`Conservando viaje con estado ABIERTO: ${doc.id}`);
                    viajeAbiertoEncontrado = true;
                    activeTravelDoc = doc;
                }
            } else {
                // Cualquier viaje que no tenga estado ABIERTO se elimina
                console.log(`Añadiendo viaje con estado ${viajeData.STATE}: ${doc.id} a lsita de borrados.`);
                docsToDelete.push(doc);
            }
        });

        if (!viajeAbiertoEncontrado) {
            console.log("No existe un documento de viaje con estado ABIERTO.")
            return;
        }

        const pasesCollection = db.collection('pases');
        const pasesQuerySnapshot = await pasesCollection.get();

        if (pasesQuerySnapshot.empty) {
            console.log("No se encontraron pases en la colección.");
            return;
        }

        pasesQuerySnapshot.forEach((doc) => {
            const paseData = doc.data();

            if (paseData.viajeId !== activeTravelDoc.id) {
                console.log(`Añadiendo pase con viajeId=${paseData.viajeId} a la lista de borrados.`);
                docsToDelete.push(doc);
            }
        })

        // Agregar las eliminaciones al batch
        docsToDelete.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Ejecutar el batch
        if (docsToDelete.length > 0) {
            await batch.commit();
            console.log(`Se eliminaron ${docsToDelete.length} documentos.`);
        } else {
            console.log('No se encontraron documentos para eliminar.');
        }

    } catch (error) {
        console.error('Error eliminando documentos:', error);
        throw error;
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
