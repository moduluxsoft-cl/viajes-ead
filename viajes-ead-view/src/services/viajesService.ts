// src/services/viajesService.ts
import {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
    query,
    where,
    Timestamp,
    setDoc,
    runTransaction,
    increment,
    limit,
    documentId,
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserData } from '../../contexts/AuthContext';
import { encryptQRData, QRData } from './encryption';

// ... (Interfaces Viaje y Pase no cambian)
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
    // ... (sin cambios en esta función)
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
    config: { destino: string; fechaViaje: Date; capacidadMaxima: number }
) => {
    console.log("🟡 [viajesService]  ➡️  sobrescribirViajeActivo()", config);

    /* ---------- 0. VALIDACIONES RÁPIDAS ---------- */
    if (!config.destino || !config.fechaViaje || config.capacidadMaxima == null) {
        console.error("🔴 Datos incompletos", config);
        throw new Error("Datos de configuración incompletos.");
    }

    /* ---------- 1. CANCELAR VIAJES ABIERTOS ---------- */
    const abiertos = await getDocs(
        query(collection(db, "viajes"), where("STATE", "==", "ABIERTO"))
    );
    console.log(`🟠 Viajes ABIERTO encontrados: ${abiertos.size}`);

    const batchCancel = writeBatch(db);
    abiertos.forEach((snap) => {
        console.log("   ⤷ Marcando CANCELADO:", snap.id);
        batchCancel.update(snap.ref, { STATE: "CANCELADO" });
    });

    try {
        if (!abiertos.empty) {
            console.log("🟠 Commit batchCancel…");
            await batchCancel.commit();
            console.log("🟢 batchCancel OK");
        }
    } catch (err: any) {
        console.error("🔴 batchCancel ERROR", err.code, err.message);
        throw err;
    }

    /* ---------- 2. CREAR NUEVO VIAJE ---------- */
    const baseId = `viaje_${config.fechaViaje.toISOString().substring(0, 10)}`;
    let viajeId = baseId;
    let viajeRef = doc(db, "viajes", viajeId);

    if ((await getDoc(viajeRef)).exists()) {
        const rnd = Math.floor(1000 + Math.random() * 9000);
        viajeId = `${baseId}_${rnd}`;
        viajeRef = doc(db, "viajes", viajeId);
        console.log(`⚠️  Colisión de ID. Usaré ${viajeId}`);
    }

    const data = {
        DESTINATION: config.destino,
        MAX_CAPACITY: Number(config.capacidadMaxima),
        DATE_TRAVEL: Timestamp.fromDate(config.fechaViaje),
        GENERATED_PASSES: 0,
        STATE: "ABIERTO",
    };

    const batchCreate = writeBatch(db);
    batchCreate.set(viajeRef, data);

    try {
        console.log("🟠 Commit batchCreate…", { id: viajeId, ...data });
        await batchCreate.commit();
        console.log("🟢 batchCreate OK. Nuevo viaje activo:", viajeId);
    } catch (err: any) {
        console.error(
            "🔴 batchCreate ERROR",
            { code: err.code, message: err.message },
            err
        );
        throw err;
    }
};




export const validarPaseConteo = async (paseId: string): Promise<{ success: boolean; message: string; pase?: Pase }> => {
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

        return { success: true, message: resultado.message, pase: resultado as Pase };

    } catch (error) {
        const message = error instanceof Error ? error.message : "Ocurrió un error inesperado al validar.";
        return { success: false, message };
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

export const crearPase = async (userData: UserData, viajeActivo: Viaje): Promise<string> => {
    if (!userData.nombre || !userData.apellido || !userData.rut || !userData.carrera) {
        throw new Error('Tu información de perfil está incompleta.');
    }

    try {
        const nuevoPaseId = await runTransaction(db, async (transaction) => {
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
            transaction.update(viajeRef, { GENERATED_PASSES: increment(1) });

            return paseId;
        });

        return nuevoPaseId;
    } catch (error) {
        console.error('Error en la transacción al crear el pase:', error);
        if (error instanceof Error) throw error;
        throw new Error('No se pudo crear el pase.');
    }
};