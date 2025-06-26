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
    getCountFromServer, orderBy
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserData } from '../../contexts/AuthContext';
import { encryptQRData, generateQRTimestamp, QRData } from './encryption';
import { obtenerConfiguracionViaje } from './configuracionService'; // Importamos el servicio de config

export interface Pase {
    id?: string;
    estudianteId: string;
    fechaViaje: string; // Formato DD/MM/YYYY
    destino: string;
    estado: 'activo' | 'usado' | 'expirado';
    qrData: string;
    fechaCreacion: Date;
    fechaExpiracion: Date;
    nombreCompleto: string;
    rut: string;
}

export const crearPase = async (
    userData: UserData,
): Promise<string> => {
    // 1. Obtener la configuración actual del viaje
    const config = await obtenerConfiguracionViaje();
    if (!config.destino || !config.fechaViaje || !config.capacidadMaxima) {
        throw new Error('El viaje no ha sido configurado por un administrador.');
    }

    // 2. Verificar si quedan cupos disponibles
    const pasesCollectionRef = collection(db, 'pases');
    const fechaViajeString = config.fechaViaje.toLocaleDateString('es-CL');
    const q = query(pasesCollectionRef, where("fechaViaje", "==", fechaViajeString));
    const snapshot = await getCountFromServer(q);
    const pasesCreados = snapshot.data().count;

    if (pasesCreados >= config.capacidadMaxima) {
        throw new Error('Lo sentimos, ya no quedan cupos disponibles para este viaje.');
    }

    // 3. Verificar que el perfil del estudiante esté completo
    if (!userData.nombre || !userData.apellido || !userData.rut || !userData.carrera) {
        throw new Error('Tu información de perfil está incompleta. Revisa tus datos.');
    }

    // 4. Continuar con la creación del pase si hay cupos
    try {
        const { timestamp, expires } = generateQRTimestamp();

        // Creamos el documento con un ID autogenerado primero
        const paseDocRef = doc(collection(db, 'pases'));
        const paseId = paseDocRef.id;

        const dataToEncrypt: QRData = {
            paseId: paseId,
            estudianteId: userData.uid,
            nombre: userData.nombre,
            apellido: userData.apellido,
            rut: userData.rut!,
            carrera: userData.carrera!,
            fechaViaje: fechaViajeString,
            destino: config.destino,
            timestamp,
            expires,
        };
        const encryptedQRData = encryptQRData(dataToEncrypt);

        const fechaExpiracionPase = new Date(config.fechaViaje);
        fechaExpiracionPase.setHours(23, 59, 59);

        const nuevoPase = {
            estudianteId: userData.uid,
            fechaViaje: fechaViajeString,
            destino: config.destino,
            estado: 'activo' as const,
            qrData: encryptedQRData,
            fechaCreacion: Timestamp.now(),
            fechaExpiracion: Timestamp.fromDate(fechaExpiracionPase),
            nombreCompleto: `${userData.nombre} ${userData.apellido}`,
            rut: userData.rut
        };

        await setDoc(paseDocRef, nuevoPase);

        return paseId;
    } catch (error) {
        console.error('Error al crear el pase:', error);
        if (error instanceof Error) throw error;
        throw new Error('No se pudo crear el pase.');
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
                estado: data.estado,
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
                estado: data.estado,
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
