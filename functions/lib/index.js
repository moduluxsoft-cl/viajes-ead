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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.testDeleteInactiveTravelsAndPases = exports.deleteInactiveTravelsAndPasesWeekly = exports.testUpdateTravelDate = exports.updateTravelDateWeekly = exports.enviarCorreoConQR = void 0;
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
const https_1 = require("firebase-functions/https");
const https_2 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const nodemailer = __importStar(require("nodemailer"));
const qrcode_1 = __importDefault(require("qrcode"));
const googleapis_1 = require("googleapis");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// Configuración de OAuth2
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const USER_EMAIL = process.env.USER_EMAIL;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
exports.enviarCorreoConQR = (0, https_2.onCall)(async (request) => {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !USER_EMAIL) {
        console.error("No se han configurado las credenciales de Gmail.");
        throw new https_2.HttpsError("internal", "El servidor no está configurado para enviar correos.");
    }
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
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
            throw new https_2.HttpsError("invalid-argument", "Se necesita un email y un contenidoQR para enviar el correo.");
        }
        const qrDataUrl = await qrcode_1.default.toDataURL(contenidoQR);
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        const htmlTemplate = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Tu Código QR de Viaje</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #FFF7F8;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="padding: 20px 0;">
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 8px;">
                                <tr>
                                    <td align="center" style="padding: 40px 0 30px 0; background-color: #BE031E; color: #ffffff; border-radius: 8px 8px 0 0;">
                                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Viajes EAD</h1>
                                        <p style="margin: 5px 0 0 0; font-size: 16px;">Sistema de Pases Escolares</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="color: #2B2B2B; font-size: 24px; font-weight: bold; text-align: center;">
                                                    ¡Tu pase de viaje está listo!
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 20px 0 30px 0; color: #2B2B2B; font-size: 16px; line-height: 24px; text-align: center;">
                                                    Aquí tienes tu código QR. Preséntalo al encargado para que pueda ser escaneado y validado.
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center">
                                                    <img src="cid:qrimage" alt="Tu Código QR" width="250" height="250" style="display: block; border: 0;" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 30px 0 0 0; color: #888888; font-size: 14px; text-align: center;">
                                                    Si no solicitaste este código, puedes ignorar este correo electrónico de forma segura.
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px; text-align: center; font-size: 12px; color: #888888; background-color: #f2f2f2; border-radius: 0 0 8px 8px;">
                                        &copy; ${new Date().getFullYear()} Viajes EAD. Todos los derechos reservados.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
        const mailOptions = {
            from: `"Viajes EAD" <${USER_EMAIL}>`,
            to: email,
            subject: "Aquí está tu pase de viaje EAD",
            html: htmlTemplate,
            attachments: [
                {
                    filename: "qr.png",
                    content: base64Data,
                    encoding: "base64",
                    cid: 'qrimage'
                }
            ]
        };
        await transporter.sendMail(mailOptions);
        console.log(`Correo con QR enviado exitosamente a ${email}`);
        return { success: true, message: "Correo enviado exitosamente." };
    }
    catch (error) {
        console.error("Error al procesar y enviar el email con QR:", error);
        if (error instanceof https_2.HttpsError) {
            throw error;
        }
        // Devolver un error genérico para otros tipos de fallos.
        throw new https_2.HttpsError("internal", "Ocurrió un error inesperado al enviar el correo.");
    }
});
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
    const actualTravelTimestamp = travelDateDoc.data().DATE_TRAVEL;
    const actualTravelDate = actualTravelTimestamp.toDate();
    //Agregar una semana
    const updatedTravelDate = new Date(actualTravelDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Quitar los segundos (establecer segundos y milisegundos a 0)
    updatedTravelDate.setHours(12, 0, 0, 0);
    await travelDateDoc.ref.update({
        DATE_TRAVEL: updatedTravelDate,
    }).then(() => {
        return;
    }).catch((error) => {
        console.error(error.message);
        throw error;
    });
}
exports.deleteInactiveTravelsAndPasesWeekly = (0, scheduler_1.onSchedule)({
    schedule: '0 16 * * *',
    timeZone: 'America/Santiago',
}, async (event) => {
    console.log("Eliminando documentos de viajes y pases inactivos.");
    await deleteInactiveTravelsAndPases().then(() => {
        console.log("Documentos eliminados exitosamente.");
    }).catch((error) => {
        console.error('Error eliminando documentos:', error);
    });
});
exports.testDeleteInactiveTravelsAndPases = (0, https_1.onRequest)(async (req, res) => {
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
    const db = (0, firestore_1.getFirestore)();
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
        let docsToDelete = [];
        let activeTravelDoc;
        // Iterar sobre todos los documentos
        travelsQuerySnapshot.forEach((doc) => {
            const viajeData = doc.data();
            if (viajeData.STATE === 'ABIERTO') {
                if (viajeAbiertoEncontrado) {
                    // Si ya encontramos un viaje abierto, este duplicado se elimina
                    console.log(`Añadiendo viaje duplicado con estado ABIERTO a lista de borrados: ${doc.id}`);
                    docsToDelete.push(doc);
                }
                else {
                    // Primer viaje con estado ABIERTO, lo conservamos
                    console.log(`Conservando viaje con estado ABIERTO: ${doc.id}`);
                    viajeAbiertoEncontrado = true;
                    activeTravelDoc = doc;
                }
            }
            else {
                // Cualquier viaje que no tenga estado ABIERTO se elimina
                console.log(`Añadiendo viaje con estado ${viajeData.STATE}: ${doc.id} a lsita de borrados.`);
                docsToDelete.push(doc);
            }
        });
        if (!viajeAbiertoEncontrado) {
            console.log("No existe un documento de viaje con estado ABIERTO.");
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
        });
        // Agregar las eliminaciones al batch
        docsToDelete.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Ejecutar el batch
        if (docsToDelete.length > 0) {
            await batch.commit();
            console.log(`Se eliminaron ${docsToDelete.length} documentos.`);
        }
        else {
            console.log('No se encontraron documentos para eliminar.');
        }
    }
    catch (error) {
        console.error('Error eliminando documentos:', error);
        throw error;
    }
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