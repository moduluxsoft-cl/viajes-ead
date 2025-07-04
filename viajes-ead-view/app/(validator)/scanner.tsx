// app/(validator)/scanner.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { QRScanner } from '../../components/QRScanner';
import { ResultModal } from '../../components/ResultModal';
import { useAuth } from '../../contexts/AuthContext';
import { decryptQRData } from '../../src/services/encryption';
import {
    validarPaseConteo,
    obtenerDetallesCompletosPase,
    Pase,
    Viaje
} from '../../src/services/viajesService';

export default function ScannerScreen() {
    const { userData } = useAuth();
    const [scanning, setScanning] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [validating, setValidating] = useState(false);

    const [scanResult, setScanResult] = useState<{
        success: boolean;
        pase?: Pase;
        viaje?: Viaje;
        error?: string;
        message?: string;
    }>({ success: false });

    const handleQRScanned = async (qrCodeData: string) => {
        setScanning(false);
        try {
            const decryptedData = decryptQRData(qrCodeData);
            if (!decryptedData.paseId) {
                throw new Error("El código QR no contiene un ID de pase válido.");
            }

            const { pase, viaje } = await obtenerDetallesCompletosPase(decryptedData.paseId);

            const hoy = new Date();
            const fechaViaje = viaje.fechaViaje;
            // Comparamos solo el año, mes y día, ignorando la hora.
            if (hoy.toDateString() !== fechaViaje.toDateString()) {
                throw new Error(`Este pase no es para el viaje de hoy. Es para el ${fechaViaje.toLocaleDateString('es-CL')}.`);
            }

            setScanResult({ success: true, pase, viaje });

        } catch (error) {
            setScanResult({
                success: false,
                error: error instanceof Error ? error.message : 'Código QR inválido o error inesperado.'
            });
        }
        setShowResult(true);
    };

    const handleValidatePase = async () => {
        if (!scanResult.pase?.id) return;

        setValidating(true);
        try {
            const validationResult = await validarPaseConteo(scanResult.pase.id);
            if (!validationResult.success) {
                throw new Error(validationResult.message);
            }
            // Actualizamos el estado con el mensaje de éxito
            setScanResult(prev => ({ ...prev, success: true, message: validationResult.message }));
        } catch (error) {
            // Actualizamos el estado con el mensaje de error
            setScanResult(prev => ({ ...prev, success: false, error: error instanceof Error ? error.message : 'Error al validar' }));
        } finally {
            setValidating(false);
        }
    };

    const resetScanner = () => {
        setShowResult(false);
        setScanResult({ success: false });
        setValidating(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Validador de Pases</Text>
                <Text style={styles.subtitle}>
                    {userData?.nombre} {userData?.apellido}
                </Text>
            </View>

            <View style={styles.scannerContainer}>
                <QRScanner
                    onQRScanned={handleQRScanned}
                    scanning={scanning}
                    onToggleScanning={() => setScanning(!scanning)}
                />
            </View>

            <ResultModal
                visible={showResult}
                onClose={resetScanner}
                onValidate={handleValidatePase}
                validating={validating}
                scanResult={scanResult}
                showValidateButton={scanResult.success && !scanResult.message}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        backgroundColor: '#667eea',
        padding: 20,
        paddingTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        marginTop: 4,
        opacity: 0.9,
    },
    scannerContainer: {
        flex: 1,
    },
});
