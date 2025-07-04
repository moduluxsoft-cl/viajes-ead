// src/services/pasesService.ts
import {
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    query,
    where,
    Timestamp,
    setDoc,
    getCountFromServer,
    orderBy,
    runTransaction,
    increment
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserData } from '../../contexts/AuthContext';
import { encryptQRData, generateQRTimestamp, QRData } from './encryption';
import { obtenerViajeActivo  } from './configuracionService';

export interface Pase {
    id?: string;
    estudianteId: string;
    fechaViaje: string;
    destino: string;
    estado: 'activo' | 'usado' | 'expirado';
    qrData: string;
    fechaCreacion: Date;
    fechaExpiracion: Date;
    nombreCompleto: string;
    rut: string;
    scanCount?: number;
}

export const crearPase = async (userData: UserData): Promise<string> => {
    const viajeActivo = await obtenerViajeActivo();
    if (!viajeActivo) {
        throw new Error('No hay ningún viaje programado o abierto para reservas en este momento.');
    }

    if (!userData.nombre || !userData.apellido || !userData.rut || !userData.carrera) {
        throw new Error('Tu información de perfil está incompleta. Revisa tus datos.');
    }

    try {
        const nuevoPaseId = await runTransaction(db, async (transaction) => {
            const viajeRef = doc(db, 'viajes', viajeActivo.id);
            const viajeDoc = await transaction.get(viajeRef);

            if (!viajeDoc.exists()) {
                throw new Error("El documento del viaje no fue encontrado.");
            }

            const pasesCreados = viajeDoc.data().pasesGenerados || 0;
            if (pasesCreados >= viajeActivo.capacidadMaxima) {
                throw new Error('Lo sentimos, ya no quedan cupos disponibles para este viaje.');
            }

            const paseDocRef = doc(collection(db, 'pases')); // Genera un ID para el nuevo pase


            const nuevoPase = {
                viajeId: viajeActivo.id,
                estudianteId: userData.uid,
                nombreCompleto: `${userData.nombre} ${userData.apellido}`,
                rut: userData.rut,
                estado: 'activo' as const,
                qrData: "...", // Tu QR encriptado
                fechaCreacion: Timestamp.now(),
                scanCount: 0
            };

            transaction.set(paseDocRef, nuevoPase);
            transaction.update(viajeRef, { pasesGenerados: increment(1) });

            return paseDocRef.id;
        });

        return nuevoPaseId;

    } catch (error) {
        console.error('Error en la transacción al crear el pase:', error);
        if (error instanceof Error) throw error;
        throw new Error('No se pudo crear el pase.');
    }
};

/**
 * Valida un pase, verifica el límite de escaneos y actualiza su estado de forma atómica.
 * @param paseId - El ID del pase a validar.
 * @returns Un objeto con el resultado de la validación.
 */
export const validarPaseConteo = async (paseId: string): Promise<{ success: boolean; message: string; pase?: Pase }> => {
    if (!paseId) {
        return { success: false, message: "ID de pase no proporcionado." };
    }

    try {
        const paseRef = doc(db, 'pases', paseId);

        const resultado = await runTransaction(db, async (transaction) => {
            const paseDoc = await transaction.get(paseRef);

            if (!paseDoc.exists()) {
                throw new Error("Pase no encontrado.");
            }

            const paseData = paseDoc.data() as Pase;

            if ((paseData.scanCount || 0) >= 2) {
                throw new Error("Este pase ya ha alcanzado el límite de 2 escaneos.");
            }

            if (paseData.estado === 'usado' || paseData.estado === 'expirado') {
                throw new Error(`Este pase ya fue ${paseData.estado}.`);
            }

            transaction.update(paseRef, {
                estado: 'usado' as const,
                scanCount: increment(1)
            });

            return {
                ...paseData,
                id: paseDoc.id,
                estado: 'usado' as const,
                scanCount: (paseData.scanCount || 0) + 1,
            };
        });

        return { success: true, message: "Pase validado exitosamente.", pase: resultado };

    } catch (error) {
        console.error("Error en la validación del pase:", error);
        const message = error instanceof Error ? error.message : "Ocurrió un error inesperado al validar.";
        return { success: false, message };
    }
};

/**
 * Obtiene un único pase por su ID
 */
export const obtenerPasePorId = async (paseId: string): Promise<Pase | null> => {
    try {
        if (!paseId) {
            throw new Error('ID de pase requerido');
        }

        const paseRef = doc(db, 'pases', paseId);
        const docSnap = await getDoc(paseRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                estudianteId: data.estudianteId,
                fechaViaje: data.fechaViaje,
                destino: data.destino,
                estado: data.estado as 'activo' | 'usado' | 'expirado',
                qrData: data.qrData,
                fechaCreacion: data.fechaCreacion.toDate(),
                fechaExpiracion: data.fechaExpiracion.toDate(),
                nombreCompleto: data.nombreCompleto,
                rut: data.rut
            };
        }
        return null;
    } catch (error) {
        console.error("Error obteniendo pase por ID:", error);
        throw new Error("No se pudo obtener el pase.");
    }
};

export const actualizarEstadoPase = async (paseId: string, nuevoEstado: 'usado' | 'expirado'): Promise<void> => {
    if (!paseId) throw new Error('ID de pase requerido');
    try {
        const paseRef = doc(db, 'pases', paseId);
        await updateDoc(paseRef, {
            estado: nuevoEstado,
            fechaValidacion: Timestamp.now() // Opcional: guardar fecha de validación
        });
    } catch (error) {
        console.error('Error actualizando estado del pase:', error);
        throw new Error('No se pudo actualizar el estado del pase');
    }
};

/**
 * Obtiene todos los pases de un estudiante específico
 */
export const obtenerPasesEstudiante = async (estudianteId: string): Promise<Pase[]> => {
    try {
        if (!estudianteId) {
            throw new Error('ID de estudiante requerido');
        }

        const pasesCollectionRef = collection(db, 'pases');
        const q = query(
            pasesCollectionRef,
            where("estudianteId", "==", estudianteId),
            orderBy("fechaCreacion", "desc")
        );

        const querySnapshot = await getDocs(q);
        const pases: Pase[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            pases.push({
                id: doc.id,
                estudianteId: data.estudianteId,
                fechaViaje: data.fechaViaje,
                destino: data.destino,
                estado: data.estado as 'activo' | 'usado' | 'expirado',
                qrData: data.qrData,
                fechaCreacion: data.fechaCreacion.toDate(),
                fechaExpiracion: data.fechaExpiracion.toDate(),
                nombreCompleto: data.nombreCompleto,
                rut: data.rut
            });
        });

        console.log(`Encontrados ${pases.length} pases para el estudiante ${estudianteId}`);
        return pases;
    } catch (error) {
        console.error("Error obteniendo pases del estudiante:", error);
        if (error instanceof Error && error.message.includes('permission-denied')) {
            throw new Error("No tienes permisos para acceder a esta información.");
        }
        throw new Error("No se pudieron obtener los pases.");
    }
};
