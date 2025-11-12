// src/services/configuracionService.ts
import {collection, getDocs, query, where} from 'firebase/firestore';
import {db} from '@shared/config/firebase';

export interface ConfiguracionViaje {
    capacidadMaxima: number;
    fechaViaje: Date;
    destino: string;
}
collection(db, 'properties');
/**
 * Obtiene una lista de valores para una propiedad específica.
 * Usado aquí para obtener la lista de carreras.
 * @param propertyName - El nombre de la propiedad a buscar (ej. "CARRERA").
 */
export const getPropertyValues = async (propertyName: string): Promise<string[]> => {
    try {
        const q = query(collection(db, 'properties'), where("name", "==", propertyName));
        const querySnapshot = await getDocs(q);

        const values = querySnapshot.docs.map(doc => doc.data().value as string);
        return values.sort();
    } catch (error) {
        throw new Error(`No se pudo obtener la lista de ${propertyName}.`);
    }
};
