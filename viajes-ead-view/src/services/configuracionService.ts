// src/services/configuracionService.ts
import { collection, getDocs, query, where, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface ConfiguracionViaje {
    capacidadMaxima: number;
    fechaViaje: Date;
    destino: string;
}

/**
 * Parsea una fecha en formato de texto en español a un objeto Date.
 * @param dateString - Ejemplo: "25 de junio de 2025, 2:30:00 p.m. UTC-4"
 */
const parseSpanishDate = (dateString: string): Date | null => {
    if (!dateString || typeof dateString !== 'string') return null;

    const months: { [key: string]: number } = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    const cleanedString = dateString.toLowerCase()
        .replace('p.m.', 'pm').replace('a.m.', 'am')
        .replace(' de ', ' ')
        .replace(',', '');

    const parts = cleanedString.split(' ');

    if (parts.length < 5) return null;

    try {
        const day = parseInt(parts[0], 10);
        const monthName = parts[1];
        const year = parseInt(parts[2], 10);
        const timeParts = parts[3].split(':');
        let hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);
        const second = parseInt(timeParts[2], 10);
        const period = parts[4];

        if (period === 'pm' && hour < 12) {
            hour += 12;
        }
        if (period === 'am' && hour === 12) {
            hour = 0;
        }

        const month = months[monthName];
        if (month === undefined) return null;

        // Creamos la fechita
        return new Date(year, month, day, hour, minute, second);

    } catch (e) {
        console.error("Fallo al parsear el string de la fecha:", e);
        return null;
    }
};


const propertiesCollectionRef = collection(db, 'properties');

export const obtenerConfiguracionViaje = async (): Promise<Partial<ConfiguracionViaje>> => {
    try {
        const querySnapshot = await getDocs(propertiesCollectionRef);
        const config: Partial<ConfiguracionViaje> = {};

        querySnapshot.forEach((doc) => {
            const property = doc.data();
            switch (property.name) {
                case 'DESTINATION':
                    config.destino = property.value;
                    break;
                case 'MAX_CAPACITY':
                    config.capacidadMaxima = Number(property.value);
                    break;
                case 'DATE_TRAVEL':
                    if (property.value instanceof Timestamp) {
                        config.fechaViaje = property.value.toDate();
                    } else {
                        const parsedDate = parseSpanishDate(property.value);
                        if (parsedDate) {
                            config.fechaViaje = parsedDate;
                        } else {
                            console.warn("No se pudo parsear la fecha:", property.value);
                        }
                    }
                    break;
            }
        });
        return config;
    } catch (error) {
        console.error("Error al obtener la configuración:", error);
        throw new Error("No se pudo obtener la configuración del viaje.");
    }
};

export const guardarConfiguracionViaje = async (config: Partial<ConfiguracionViaje>): Promise<void> => {
    try {
        const batch = writeBatch(db);
        const propertyMap: { [key in keyof ConfiguracionViaje]?: string } = {
            destino: 'DESTINATION',
            capacidadMaxima: 'MAX_CAPACITY',
            fechaViaje: 'DATE_TRAVEL'
        };
        for (const key of Object.keys(config) as Array<keyof ConfiguracionViaje>) {
            const propertyName = propertyMap[key];
            if (propertyName) {
                const q = query(propertiesCollectionRef, where("name", "==", propertyName));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const docId = querySnapshot.docs[0].id;
                    const docRef = doc(db, 'properties', docId);

                    let valueToSave: string | number | Date | Timestamp | undefined = config[key];

                    if (key === 'fechaViaje' && valueToSave instanceof Date) {
                        valueToSave = Timestamp.fromDate(valueToSave);
                    }

                    if (valueToSave !== undefined) {
                        batch.update(docRef, {value: valueToSave});
                    }
                }
            }
        }
        await batch.commit();
    } catch (error) {
        console.error("Error al guardar la configuración:", error);
        throw new Error("No se pudo guardar la configuración del viaje.");
    }
};

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
        console.error(`Error fetching property ${propertyName}:`, error);
        throw new Error(`No se pudo obtener la lista de ${propertyName}.`);
    }
};
