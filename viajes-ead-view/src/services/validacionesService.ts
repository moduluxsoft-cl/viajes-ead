// services/validacionesService.ts eesto faltaaa
import {
    collection,
    doc,
    addDoc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Validacion, Pase } from '../types/index';
import { actualizarEstadoPase } from './pasesService';

/**
 * Valida un código QR y registra la validación
 */
export const validarPase = async (
    qrData: string,
    validadorId: string,
    ubicacion?: { lat: number; lng: number }
): Promise<{ success: boolean; message: string; pase?: Pase }> => {
    if (!qrData || !validadorId) {
        return {
            success: false,
            message: 'Datos de validación incompletos'
        };
    }

    try {
        // Decodificar QR (en producción usar decriptación real)
        let decodedData;
        try {
            decodedData = JSON.parse(atob(qrData));
        } catch (e) {
            return {
                success: false,
                message: 'Código QR inválido'
            };
        }

        const { id: paseId } = decodedData;

        if (!paseId) {
            return {
                success: false,
                message: 'Código QR no contiene ID de pase'
            };
        }

        // Obtener el pase
        const paseDoc = await getDoc(doc(db, 'pases', paseId));

        if (!paseDoc.exists()) {
            return {
                success: false,
                message: 'Pase no encontrado'
            };
        }

        const paseData = paseDoc.data();
        const pase: Pase = {
            id: paseDoc.id,
            ...paseData,
            fechaCreacion: paseData.fechaCreacion?.toDate() || new Date(),
            fechaExpiracion: paseData.fechaExpiracion?.toDate() || new Date()
        } as Pase;

        // Verificar estado del pase
        if (pase.estado === 'usado') {
            return {
                success: false,
                message: 'Este pase ya fue utilizado',
                pase
            };
        }

        if (pase.estado === 'expirado' || new Date() > pase.fechaExpiracion) {
            return {
                success: false,
                message: 'Este pase está expirado',
                pase
            };
        }

        // Verificar fecha de viaje
        const fechaViaje = new Date(pase.fechaViaje);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaViaje.setHours(0, 0, 0, 0);

        if (fechaViaje.getTime() !== hoy.getTime()) {
            return {
                success: false,
                message: `Este pase es para el ${pase.fechaViaje}`,
                pase
            };
        }

        // Crear registro de validación
        const validacionData = {
            paseId: pase.id,
            validadorId,
            fechaValidacion: Timestamp.now(),
            ubicacion,
            estado: 'aprobado'
        };

        await addDoc(collection(db, 'Validaciones'), validacionData);

        // Actualizar estado del pase a 'usado'
        await actualizarEstadoPase(pase.id!, 'usado');
        pase.estado = 'usado';

        return {
            success: true,
            message: 'Pase validado correctamente',
            pase
        };

    } catch (error) {
        console.error('Error validando pase:', error);
        return {
            success: false,
            message: 'Error al validar el pase'
        };
    }
};

/**
 * Obtiene el historial de validaciones de un validador
 */
export const obtenerValidacionesValidador = async (
    validadorId: string | undefined,
    limite: number = 50
): Promise<Validacion[]> => {
    if (!validadorId) {
        console.warn('obtenerValidacionesValidador: validadorId es undefined');
        return [];
    }

    try {
        const q = query(
            collection(db, 'Validaciones'),
            where('validadorId', '==', validadorId),
            orderBy('fechaValidacion', 'desc'),
            limit(limite)
        );

        const querySnapshot = await getDocs(q);
        const validaciones: Validacion[] = [];

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            validaciones.push({
                id: doc.id,
                paseId: data.paseId,
                validadorId: data.validadorId,
                fechaValidacion: data.fechaValidacion?.toDate() || new Date(),
                ubicacion: data.ubicacion,
                observaciones: data.observaciones
            });
        }

        return validaciones;
    } catch (error) {
        console.error('Error obteniendo validaciones:', error);
        return [];
    }
};

/**
 * Obtiene estadísticas de validaciones del día
 */
export const obtenerEstadisticasDelDia = async (
    validadorId: string | undefined
): Promise<{
    total: number;
    aprobadas: number;
    rechazadas: number;
}> => {
    if (!validadorId) {
        return { total: 0, aprobadas: 0, rechazadas: 0 };
    }

    try {
        // Obtener inicio del día
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const inicioDelDia = Timestamp.fromDate(hoy);

        const q = query(
            collection(db, 'Validaciones'),
            where('validadorId', '==', validadorId),
            where('fechaValidacion', '>=', inicioDelDia)
        );

        const querySnapshot = await getDocs(q);

        const stats = {
            total: querySnapshot.size,
            aprobadas: 0,
            rechazadas: 0
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.estado === 'aprobado') {
                stats.aprobadas++;
            } else {
                stats.rechazadas++;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return { total: 0, aprobadas: 0, rechazadas: 0 };
    }
};

/**
 * Obtiene información del estudiante asociado a un pase
 */
export const obtenerInfoEstudiantePase = async (paseId: string): Promise<{
    nombre: string;
    apellido: string;
    rut: string;
    carrera: string;
} | null> => {
    try {
        // Primero obtener el pase
        const paseDoc = await getDoc(doc(db, 'pases', paseId));
        if (!paseDoc.exists()) {
            return null;
        }

        const paseData = paseDoc.data();
        const estudianteId = paseData.estudianteId;

        // Luego obtener info del estudiante
        const estudianteDoc = await getDoc(doc(db, 'users', estudianteId));
        if (!estudianteDoc.exists()) {
            return null;
        }

        const estudianteData = estudianteDoc.data();
        return {
            nombre: estudianteData.nombre || '',
            apellido: estudianteData.apellido || '',
            rut: estudianteData.rut || '',
            carrera: estudianteData.carrera || ''
        };
    } catch (error) {
        console.error('Error obteniendo info del estudiante:', error);
        return null;
    }
};