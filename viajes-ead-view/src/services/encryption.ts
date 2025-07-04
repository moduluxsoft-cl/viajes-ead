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
        console.error('Error encrypting QR data:', error);
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

        // Verificar que no haya expirado
        if (Date.now() > data.expires) {
            throw new Error('Código QR expirado');
        }

        return data;
    } catch (error) {
        console.error('Error decrypting QR data:', error);
        throw new Error('Código QR inválido o expirado');
    }
};

export const generateQRTimestamp = (): { timestamp: number; expires: number } => {
    const now = Date.now();
    const expires = now + (24 * 60 * 60 * 1000); // 24 horas

    return { timestamp: now, expires };
};