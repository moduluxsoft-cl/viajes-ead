import {setGlobalOptions} from "firebase-functions";
import {onSchedule} from "firebase-functions/scheduler";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp, QueryDocumentSnapshot} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getAuth} from "firebase-admin/auth";
import nodemailer from 'nodemailer';
import QRCode from "qrcode";

setGlobalOptions({ maxInstances: 10 });

initializeApp({
    projectId: 'viajes-ead'
});
const db = getFirestore();

// Configuración de OAuth2
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const USER_EMAIL = process.env.USER_EMAIL;

async function sendMailWithRetry(
    transporter: nodemailer.Transporter,
    mailOptions: nodemailer.SendMailOptions,
    maxRetries = 4
): Promise<void> {
    const transientCodes = new Set(["ECONNECTION", "ETIMEDOUT", "ESOCKET", "ECONNRESET", "EPIPE"]);
    const isTransient = (err: any) =>
        (err?.code && transientCodes.has(err.code)) ||
        /Connection closed|ECONNRESET|Timed? out|socket|CONN/i.test(String(err?.message || ""));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            await transporter.sendMail(mailOptions);
            return;
        } catch (err) {
            if (attempt === maxRetries || !isTransient(err)) throw err;
            const delay = Math.min(8000, 400 * Math.pow(2, attempt)) + Math.random() * 200;
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}

export const enviarCorreoConQR = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Se requiere autenticación para realizar esta acción.");
    }
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !USER_EMAIL) {
        console.error("No se han configurado las credenciales de Gmail.");
        throw new HttpsError("internal", "El servidor no está configurado para enviar correos.");
    }

    try {
        const { email, contenidoQR } = request.data;
        if (!email || !contenidoQR) {
            throw new HttpsError("invalid-argument", "Se necesita un email y un contenidoQR para enviar el correo.");
        }

        // QR pequeño para adjunto liviano
        const qrDataUrl = await QRCode.toDataURL(contenidoQR, { margin: 1, width: 250 });
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

        const mailOptions: nodemailer.SendMailOptions = {
            from: `"Viajes EAD" <${USER_EMAIL}>`,
            to: email,
            subject: "Aquí está tu pase de viaje EAD",
            html: htmlTemplate,
            attachments: [
                {
                    filename: "qr.png",
                    content: base64Data,
                    encoding: "base64",
                    cid: "qrimage",
                    contentType: "image/png",
                },
            ],
        };

        // Transporte SMTP explícito (sin pasar accessToken; Nodemailer gestiona xoauth2)
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                type: "OAuth2",
                user: USER_EMAIL,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
            },
            // Timeouts más generosos para evitar cortes tempranos bajo latencia
            connectionTimeout: 30_000,
            greetingTimeout: 20_000,
            socketTimeout: 60_000,
        } as nodemailer.TransportOptions);

        await sendMailWithRetry(transporter, mailOptions, 4);

        console.log(`Correo con QR enviado exitosamente a ${email}`);
        return { success: true, message: "Correo enviado exitosamente." };
    } catch (error) {
        console.error("Error al procesar y enviar el email con QR:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Ocurrió un error inesperado al enviar el correo.");
    }
});

export const updateTravelDateWeekly = onSchedule(
    {
        schedule: '0 23 * * 3',
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

export const deleteInactiveTravelsAndPasesWeekly = onSchedule(
    {
        schedule: '10 23 * * 3',
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

    try {
        if (!travelDateDoc)
            throw new Error("Documento con STATE = \"ABIERTO\" no encontrado.");

        console.log(`Documento de fecha de viaje, con id = "${travelDateDoc.id}" encontrado.`);

        const actualTravelTimestamp = travelDateDoc.data().DATE_TRAVEL as Timestamp;
        const actualTravelDate = actualTravelTimestamp.toDate();
        const actualDestination = travelDateDoc.data().DESTINATION as string;
        const actualCapacity = travelDateDoc.data().MAX_CAPACITY as number;
        const updatedTravelDate = new Date(actualTravelDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Quitar los segundos (establecer segundos y milisegundos a 0)
        updatedTravelDate.setHours(12, 0, 0, 0);

        const batchCancel = db.batch();

        querySnapshot.forEach((snap) => {
            batchCancel.update(snap.ref, { STATE: "CERRADO" });
        });

        await batchCancel.commit();

        const counterRef = db.collection('counters').doc('viajes_counter');
        const counterSnapshot = await counterRef.get();
        const currentNumber = counterSnapshot.exists ? counterSnapshot.data()?.currentNumber : 0;
        const newTripNumber = currentNumber + 1;
        const nuevoViajeId = `viajes-${newTripNumber}`;
        const nuevoViajeRef = db.collection("viajes").doc(nuevoViajeId);

        const dataNuevoViaje = {
            DESTINATION: actualDestination,
            MAX_CAPACITY: actualCapacity,
            DATE_TRAVEL: updatedTravelDate,
            GENERATED_PASSES: 0,
            STATE: "ABIERTO",
            TRIP_NUMBER: newTripNumber,
        };

        await nuevoViajeRef.set(dataNuevoViaje);
        await counterRef.set({ currentNumber: newTripNumber }, { merge: true });
    } catch (error) {
        throw new Error("No se pudo crear el nuevo viaje. Inténtalo de nuevo. Causa: " + error + ".");
    }
}

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
        let docsToDelete: QueryDocumentSnapshot[] = [];
        let activeTravelDoc: QueryDocumentSnapshot;

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
            throw error;
        }
        if (error instanceof Error) {
            throw new HttpsError("internal", error.message);
        }
        throw new HttpsError("internal", "Ocurrió un error inesperado al eliminar el usuario.");
    }
});


export const consolidarAuditoriaViajes = onSchedule(
    {
        schedule: '0 20 * * *',
        timeZone: 'America/Santiago',
    },
    async (event) => {
        console.log("Iniciando consolidación de auditoría de viajes");

        const db = getFirestore();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const hoySinHora = Timestamp.fromDate(hoy);

        try {
            const viajesSnapshot = await db
                .collection('viajes')
                .where('DATE_TRAVEL', '>=', hoySinHora)
                .where('DATE_TRAVEL', '<', Timestamp.fromDate(
                    new Date(hoy.getTime() + 24 * 60 * 60 * 1000)
                ))
                .where('STATE', '==', 'CERRADO')
                .get();

            if (viajesSnapshot.empty) {
                console.log('No hay viajes para consolidar hoy');
                return;
            }

            for (const viajeDoc of viajesSnapshot.docs) {
                const viajeId = viajeDoc.id;
                const viajeData = viajeDoc.data();

                console.log(`Consolidando viaje ${viajeId} - ${viajeData.DESTINATION}`);

                const auditoriaSnapshot = await db
                    .collection('auditoria_viajes')
                    .where('viajeId', '==', viajeId)
                    .where('consolidado', '==', false)
                    .get();

                const batch = db.batch();
                let registrosConsolidados = 0;

                auditoriaSnapshot.forEach(doc => {
                    const data = doc.data();
                    const updateData: any = {
                        consolidado: true,
                        fechaConsolidacion: Timestamp.now()
                    };

                    const tieneIda = data.validacionIda?.validado === true;
                    const tieneVuelta = data.validacionVuelta?.validado === true;

                    if (tieneIda && tieneVuelta) {
                        updateData.estadoUso = 'OK';
                        updateData.esAnomalia = false;
                        updateData.motivoAnomalia = null;
                    } else if (tieneIda && !tieneVuelta) {
                        updateData.estadoUso = 'SOLO_IDA';
                        updateData.esAnomalia = true;
                        updateData.motivoAnomalia = 'No completó el viaje de vuelta';
                    } else if (!tieneIda && tieneVuelta) {
                        updateData.estadoUso = 'SOLO_VUELTA';
                        updateData.esAnomalia = true;
                        updateData.motivoAnomalia = 'No registró el viaje de ida';
                    } else {
                        updateData.estadoUso = 'SIN_USO';
                        updateData.esAnomalia = true;
                        updateData.motivoAnomalia = 'QR generado pero no utilizado';
                    }

                    batch.update(doc.ref, updateData);
                    registrosConsolidados++;
                });

                await registrarPasesSinUso(viajeId, viajeData);

                if (registrosConsolidados > 0) {
                    await batch.commit();
                    console.log(`${registrosConsolidados} registros consolidados para viaje ${viajeId}`);
                }

                await actualizarEstadisticasViaje(viajeId);
            }

            console.log("Consolidación completada exitosamente");

        } catch (error) {
            console.error('Error en consolidación:', error);
            throw error;
        }
    }
);

async function registrarPasesSinUso(viajeId: string, viajeData: any) {
    const db = getFirestore();

    const pasesSnapshot = await db
        .collection('pases')
        .where('viajeId', '==', viajeId)
        .get();

    const pasesConQR = new Map();

    pasesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.qrData) {
            pasesConQR.set(data.estudianteId, {
                paseId: doc.id,
                ...data
            });
        }
    });

    const auditoriaSnapshot = await db
        .collection('auditoria_viajes')
        .where('viajeId', '==', viajeId)
        .get();

    const estudiantesConAuditoria = new Set();
    auditoriaSnapshot.forEach(doc => {
        estudiantesConAuditoria.add(doc.data().estudianteId);
    });

    const batch = db.batch();
    let registrosCreados = 0;

    for (const [estudianteId, paseData] of pasesConQR) {
        if (!estudiantesConAuditoria.has(estudianteId)) {
            const estudianteDoc = await db
                .collection('users')
                .doc(estudianteId)
                .get();

            if (estudianteDoc.exists) {
                const estudianteData = estudianteDoc.data();
                if (!estudianteData) {
                    console.warn(`estudianteDoc.data() es undefined para estudianteId=${estudianteId}`);
                    continue;
                }
                const auditoriaId = `${viajeId}_${estudianteId}`;
                const auditoriaRef = db.collection('auditoria_viajes').doc(auditoriaId);

                batch.set(auditoriaRef, {
                    viajeId,
                    fechaViaje: viajeData.DATE_TRAVEL,
                    destino: viajeData.DESTINATION,
                    tripNumber: viajeData.TRIP_NUMBER,

                    estudianteId,
                    nombreCompleto: `${estudianteData.nombre} ${estudianteData.apellido}`,
                    rut: estudianteData.rut,
                    email: estudianteData.email,
                    carrera: estudianteData.carrera,

                    paseId: paseData.paseId,
                    fechaGeneracion: paseData.fechaCreacion,

                    validacionIda: { validado: false },
                    validacionVuelta: { validado: false },

                    estadoUso: 'SIN_USO',
                    esAnomalia: true,
                    motivoAnomalia: 'QR generado pero no utilizado',

                    consolidado: true,
                    fechaConsolidacion: Timestamp.now()
                });

                registrosCreados++;
            }
        }
    }

    if (registrosCreados > 0) {
        await batch.commit();
        console.log(`${registrosCreados} registros de "sin uso" creados`);
    }
}

async function actualizarEstadisticasViaje(viajeId: string) {
    const db = getFirestore();

    const auditoriaSnapshot = await db
        .collection('auditoria_viajes')
        .where('viajeId', '==', viajeId)
        .where('consolidado', '==', true)
        .get();

    let totalOK = 0;
    let totalSoloIda = 0;
    let totalSoloVuelta = 0;
    let totalSinUso = 0;

    auditoriaSnapshot.forEach(doc => {
        const estado = doc.data().estadoUso;
        switch(estado) {
            case 'OK': totalOK++; break;
            case 'SOLO_IDA': totalSoloIda++; break;
            case 'SOLO_VUELTA': totalSoloVuelta++; break;
            case 'SIN_USO': totalSinUso++; break;
        }
    });

    await db.collection('viajes').doc(viajeId).update({
        STATS_CONSOLIDADAS: {
            totalRegistros: auditoriaSnapshot.size,
            totalOK,
            totalSoloIda,
            totalSoloVuelta,
            totalSinUso,
            porcentajeOK: auditoriaSnapshot.size > 0 ?
                (totalOK / auditoriaSnapshot.size * 100).toFixed(2) : 0,
            fechaUltimaConsolidacion: Timestamp.now()
        }
    });

    console.log(`Estadísticas actualizadas para viaje ${viajeId}`);
}
