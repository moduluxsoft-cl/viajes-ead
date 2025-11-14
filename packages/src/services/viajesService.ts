// src/services/viajesService.ts
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    increment,
    limit,
    orderBy,
    query,
    runTransaction,
    setDoc,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import {db} from '@shared/config/firebase';
import {UserData} from '@shared/contexts/AuthContext';
import {encryptQRData, QRData} from './encryption';
import {getServerTimeFromHeader} from "@shared/services/utilsService";
import {AuditoriaViaje} from '@shared/types/auditoria.types';

export interface Viaje {
    id: string;
    destino: string;
    fechaViaje: Date;
    capacidadMaxima: number;
    pasesGenerados: number;
    estado: string;
}

export interface Pase {
    id: string;
    viajeId: string;
    estudianteId: string;
    nombreCompleto: string;
    rut: string;
    estado: 'activo' | 'usado' | 'expirado';
    qrData: string;
    fechaCreacion: Date;
    scanCount: number;
}

/**
 * Obtiene el viaje que está actualmente abierto para reservas.
 * TRADUCE: Lee desde Firestore (MAYÚSCULAS) y devuelve para la App (minúsculas).
 */
export const obtenerViajeActivo = async (): Promise<Viaje | null> => {
    const viajesRef = collection(db, 'viajes');
    const q = query(viajesRef, where("STATE", "==", "ABIERTO"), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
        id: doc.id,
        destino: data.DESTINATION,
        fechaViaje: data.DATE_TRAVEL.toDate(),
        capacidadMaxima: data.MAX_CAPACITY,
        pasesGenerados: data.GENERATED_PASSES,
        estado: data.STATE,
    };
};

/**
 * Crea siempre un nuevo viaje activo y cancela los anteriores.
 * Incluye logs detallados para depurar errores de batch.
 */
export const sobrescribirViajeActivo = async (
    config: { destino: string; capacidadMaxima: number }
) => {

    if (!config.destino || config.capacidadMaxima == null) {
        throw new Error("Datos de configuración incompletos.");
    }

    const abiertosQuery = query(collection(db, "viajes"), where("STATE", "==", "ABIERTO"));
    const abiertosSnap = await getDocs(abiertosQuery);
    const docViajeAbierto = abiertosSnap.docs[0];

    if (!abiertosSnap.empty) {
        const batchCancel = writeBatch(db);
        abiertosSnap.forEach((snap) => {
            batchCancel.update(snap.ref, { STATE: "CANCELADO" });
        });
        try {
            await batchCancel.commit();
        } catch (err) {
            throw err;
        }
    }

    try {
        await runTransaction(db, async (transaction) => {
            // Referencia al documento que actúa como nuestro contador.
            const counterRef = doc(db, 'counters', 'viajes_counter');
            const counterDoc = await transaction.get(counterRef);
            const currentNumber = counterDoc.exists() ? counterDoc.data().currentNumber : 0;
            const newTripNumber = currentNumber + 1;
            const nuevoViajeId = `viajes-${newTripNumber}`;
            const nuevoViajeRef = doc(db, "viajes", nuevoViajeId);

            const dataNuevoViaje = {
                DESTINATION: config.destino,
                MAX_CAPACITY: Number(config.capacidadMaxima),
                DATE_TRAVEL: docViajeAbierto.data().DATE_TRAVEL,
                GENERATED_PASSES: 0,
                STATE: "ABIERTO",
                TRIP_NUMBER: newTripNumber,
            };

            transaction.set(nuevoViajeRef, dataNuevoViaje);
            transaction.set(counterRef, { currentNumber: newTripNumber }, { merge: true });
        });

    } catch (error) {
        throw new Error("No se pudo crear el nuevo viaje. Inténtalo de nuevo.");
    }
};
export const validarPaseConteo = async (
    paseId: string,
    validadorData?: { uid: string; nombre: string; apellido: string }
): Promise<{ success: boolean; message?: string; pase?: Pase; error?: string }> => {

    const paseRef = doc(db, 'pases', paseId);
    try {
        const resultado = await runTransaction(db, async (transaction) => {
            const paseDoc = await transaction.get(paseRef);
            if (!paseDoc.exists()) throw new Error("Pase no encontrado.");

            const paseData = paseDoc.data() as Omit<Pase, 'id' | 'fechaCreacion'> & { fechaCreacion: Timestamp };

            if ((paseData.scanCount || 0) >= 2) throw new Error("Este pase ya ha alcanzado el límite de 2 escaneos.");

            const nuevoScanCount = (paseData.scanCount || 0) + 1;
            let nuevoEstado: 'activo' | 'usado' | 'expirado' = paseData.estado;
            let mensaje = '';

            if (nuevoScanCount === 1) {
                nuevoEstado = 'usado';
                mensaje = 'Pase validado para el viaje de IDA.';
            } else if (nuevoScanCount === 2) {
                mensaje = 'Pase validado para el viaje de VUELTA.';
            }

            transaction.update(paseRef, { estado: nuevoEstado, scanCount: increment(1) });

            return {
                ...paseData,
                id: paseDoc.id,
                estado: nuevoEstado,
                scanCount: nuevoScanCount,
                message: mensaje,
                fechaCreacion: paseData.fechaCreacion.toDate()
            };
        });

        if (validadorData) {
            if (resultado.scanCount === 1) {
                await registrarValidacionEnAuditoria(paseId, 'IDA', validadorData);
            } else if (resultado.scanCount === 2) {
                await registrarValidacionEnAuditoria(paseId, 'VUELTA', validadorData);
            }
        }

        return { success: true, message: resultado.message, pase: resultado as Pase };

    } catch (error) {
        const message = error instanceof Error ? error.message : "Ocurrió un error inesperado al validar.";
        return { success: false, error: message };
    }
};

export const obtenerPasesEstudiante = async (estudianteId: string): Promise<Pase[]> => {
    const pasesRef = collection(db, 'pases');
    const q = query(pasesRef, where("estudianteId", "==", estudianteId), orderBy("fechaCreacion", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion.toDate(),
    } as Pase));
};

export const obtenerViajesPorIds = async (ids: string[]): Promise<Map<string, Viaje>> => {
    const viajesMap = new Map<string, Viaje>();
    if (ids.length === 0) return viajesMap;

    const chunks = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

    for (const chunk of chunks) {
        const viajesRef = collection(db, 'viajes');
        const q = query(viajesRef, where(documentId(), 'in', chunk));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            viajesMap.set(doc.id, {
                id: doc.id,
                destino: data.DESTINATION,
                fechaViaje: data.DATE_TRAVEL.toDate(),
                capacidadMaxima: data.MAX_CAPACITY,
                pasesGenerados: data.GENERATED_PASSES,
                estado: data.STATE,
            });
        });
    }

    return viajesMap;
};

export const obtenerDetallesCompletosPase = async (paseId: string): Promise<{ pase: Pase; viaje: Viaje }> => {
    const paseRef = doc(db, 'pases', paseId);
    const paseSnap = await getDoc(paseRef);
    if (!paseSnap.exists()) throw new Error("El pase no existe.");

    const paseData = paseSnap.data() as Omit<Pase, 'id' | 'fechaCreacion'> & { fechaCreacion: Timestamp };
    const pase: Pase = {
        id: paseSnap.id,
        ...paseData,
        fechaCreacion: paseData.fechaCreacion.toDate()
    };

    if (!pase.viajeId) throw new Error("Este pase no tiene un viaje asociado.");

    const viajeRef = doc(db, 'viajes', pase.viajeId);
    const viajeSnap = await getDoc(viajeRef);
    if (!viajeSnap.exists()) throw new Error("El viaje asociado a este pase no existe.");

    const viajeData = viajeSnap.data();
    const viaje: Viaje = {
        id: viajeSnap.id,
        destino: viajeData.DESTINATION,
        fechaViaje: viajeData.DATE_TRAVEL.toDate(),
        capacidadMaxima: viajeData.MAX_CAPACITY,
        pasesGenerados: viajeData.GENERATED_PASSES,
        estado: viajeData.STATE,
    }

    return { pase, viaje };
};

export const crearPase = async (userData: UserData, viajeActivo: Viaje): Promise<{
    paseId: string;
    encryptedQRData: string
}> => {
    if (!userData.nombre || !userData.apellido || !userData.rut || !userData.carrera) {
        throw new Error('Tu información de perfil está incompleta.');
    }
    const serverTime = await getServerTimeFromHeader();
    const serverUtc = new Date(serverTime);
    const diaSemana = serverUtc.getDay();
    const hora = serverUtc.getHours();
    const bloqueado =
        (diaSemana === 3 && hora >= 13) ||
        (diaSemana === 4 && hora < 19);
    if (bloqueado) {
        throw new Error(
            'La generación de pases está cerrada. ' +
            'Podrás generar tu pase para el próximo viaje a partir del jueves a las 08:00 hrs.'
        );
    }

    try {
        return await runTransaction(db, async (transaction) => {
            const viajeRef = doc(db, 'viajes', viajeActivo.id);
            const viajeDoc = await transaction.get(viajeRef);

            if (!viajeDoc.exists()) throw new Error("El viaje activo no fue encontrado.");

            const pasesActuales = viajeDoc.data().GENERATED_PASSES || 0;
            if (pasesActuales >= viajeDoc.data().MAX_CAPACITY) throw new Error('No quedan cupos disponibles.');

            const paseDocRef = doc(collection(db, 'pases'));
            const paseId = paseDocRef.id;

            const dataToEncrypt: Partial<QRData> = {
                paseId,
                estudianteId: userData.uid,
                nombre: userData.nombre,
                apellido: userData.apellido,
                rut: userData.rut!,
                carrera: userData.carrera!,
                fechaViaje: viajeActivo.fechaViaje.toISOString(),
            };
            const encryptedQRData = encryptQRData(dataToEncrypt);

            const nuevoPase = {
                viajeId: viajeActivo.id,
                estudianteId: userData.uid,
                nombreCompleto: `${userData.nombre} ${userData.apellido}`,
                rut: userData.rut,
                estado: 'activo' as const,
                qrData: encryptedQRData,
                fechaCreacion: Timestamp.now(),
                scanCount: 0,
            };

            transaction.set(paseDocRef, nuevoPase);
            transaction.update(viajeRef, {GENERATED_PASSES: increment(1)});

            return { paseId, encryptedQRData };
        });
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('No se pudo crear el pase.');
    }
};

export async function registrarValidacionEnAuditoria(
    paseId: string,
    tipoValidacion: 'IDA' | 'VUELTA',
    validadorData: { uid: string; nombre: string; apellido: string }
): Promise<void> {
    try {
        const paseRef = doc(db, 'pases', paseId);
        const paseDoc = await getDoc(paseRef);
        if (!paseDoc.exists()) throw new Error('Pase no encontrado');

        const paseData = paseDoc.data();
        const viajeId = paseData.viajeId;
        const estudianteId = paseData.estudianteId;

        const viajeRef = doc(db, 'viajes', viajeId);
        const viajeDoc = await getDoc(viajeRef);
        if (!viajeDoc.exists()) throw new Error('Viaje no encontrado');
        const viajeData = viajeDoc.data();

        const estudianteRef = doc(db, 'users', estudianteId);
        const estudianteDoc = await getDoc(estudianteRef);
        if (!estudianteDoc.exists()) throw new Error('Estudiante no encontrado');
        const estudianteData = estudianteDoc.data();

        const auditoriaId = `${viajeId}_${estudianteId}`;

        const auditoriaRef = doc(db, 'auditoria_viajes', auditoriaId);
        const auditoriaDoc = await getDoc(auditoriaRef);

        const horaValidacion = new Date();
        const validacionData = {
            validado: true,
            horaValidacion,
            validadorId: validadorData.uid,
            validadorNombre: `${validadorData.nombre} ${validadorData.apellido}`
        };

        if (auditoriaDoc.exists()) {
            const updateData: any = {};
            if (tipoValidacion === 'IDA') {
                updateData.validacionIda = validacionData;
            } else {
                updateData.validacionVuelta = validacionData;
            }

            const currentData = auditoriaDoc.data();
            const tienIda = tipoValidacion === 'IDA' || currentData.validacionIda?.validado;
            const tieneVuelta = tipoValidacion === 'VUELTA' || currentData.validacionVuelta?.validado;

            if (tienIda && tieneVuelta) {
                updateData.estadoUso = 'OK';
                updateData.esAnomalia = false;
                updateData.motivoAnomalia = null;
            } else if (tienIda && !tieneVuelta) {
                updateData.estadoUso = 'SOLO_IDA';
                updateData.esAnomalia = true;
                updateData.motivoAnomalia = 'Falta validación de vuelta';
            } else if (!tienIda && tieneVuelta) {
                updateData.estadoUso = 'SOLO_VUELTA';
                updateData.esAnomalia = true;
                updateData.motivoAnomalia = 'Falta validación de ida';
            }

            await updateDoc(auditoriaRef, updateData); // Sintaxis v9

        } else {

            const nuevoRegistro: AuditoriaViaje = {
                viajeId,
                fechaViaje: viajeData.DATE_TRAVEL.toDate(),
                destino: viajeData.DESTINATION,
                tripNumber: viajeData.TRIP_NUMBER,

                estudianteId,
                nombreCompleto: `${estudianteData.nombre} ${estudianteData.apellido}`,
                rut: estudianteData.rut,
                email: estudianteData.email,
                carrera: estudianteData.carrera,

                paseId,
                fechaGeneracion: paseData.fechaCreacion.toDate(),

                validacionIda: tipoValidacion === 'IDA' ? validacionData : {
                    validado: false
                },
                validacionVuelta: tipoValidacion === 'VUELTA' ? validacionData : {
                    validado: false
                },

                estadoUso: tipoValidacion === 'IDA' ? 'SOLO_IDA' : 'SOLO_VUELTA',
                esAnomalia: true,
                motivoAnomalia: tipoValidacion === 'IDA' ?
                    'Falta validación de vuelta' : 'Falta validación de ida',

                consolidado: false
            };

            await setDoc(auditoriaRef, nuevoRegistro); // Sintaxis v9
        }

        console.log(`Auditoría registrada: ${auditoriaId}, tipo: ${tipoValidacion}`);

    } catch (error) {
        console.error('Error registrando auditoría:', error);
    }
}
/**
 * Obtiene estadísticas de los pases generados para un viaje específico.
 * @param viajeId El ID del viaje del que se quieren obtener las estadísticas.
 * @returns Un objeto con el total de pases generados, pases usados 1 vez y pases usados 2 veces.
 */
export const obtenerEstadisticasPases = async (viajeId: string) => {
    const pasesRef = collection(db, 'pases');
    const q = query(pasesRef, where('viajeId', '==', viajeId));
    const snapshot = await getDocs(q);

    let totalPasesGenerados = 0;
    let pasesUsadosUnaVez = 0;
    let pasesUsadosDosVeces = 0;
    const estudiantesConQR = new Set<string>();

    snapshot.docs.forEach(doc => {
        const pase = doc.data() as Pase;
        totalPasesGenerados++;
        estudiantesConQR.add(pase.estudianteId);

        if (pase.scanCount === 1) {
            pasesUsadosUnaVez++;
        } else if (pase.scanCount === 2) {
            pasesUsadosDosVeces++;
        }
    });

    return {
        totalPasesGenerados,
        estudiantesUnicosConQR: estudiantesConQR.size,
        pasesUsadosUnaVez,
        pasesUsadosDosVeces,
    };
};




