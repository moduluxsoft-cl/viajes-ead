import CryptoJS from 'crypto-js';

const SECRET_KEY = 'viajes-ead-2025-secret-key-ultra-secure';

export interface QRData {
    paseId: string;
    estudianteId: string;
    nombre: string;
    apellido: string;
    rut: string;
    carrera: string;
    fechaViaje: string;
    destino: string;
    timestamp: number;
    expires: number;
}

export const encryptQRData = (data: Partial<QRData>): string => {
    try {
        const jsonString = JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
        return encrypted;
    } catch (error) {
        throw new Error('Error al generar código QR');
    }
};

export const decryptQRData = (encryptedData: string): QRData => {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
        const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

        if (!jsonString) {
            throw new Error('Datos inválidos');
        }

        const data: QRData = JSON.parse(jsonString);

        if (Date.now() > data.expires) {
            throw new Error('Código QR expirado');
        }

        return data;
    } catch (error) {

        if (error instanceof Error) {
            if (error.message === 'Código QR expirado' || error.message === 'Datos inválidos') {
                throw error;
            }
        }
        throw new Error('Error en la decodificación del QR.');
    }
};



