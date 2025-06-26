// app/(validator)/scanner.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { QRScanner } from '../../components/QRScanner';
import { ResultModal } from '../../components/ResultModal';
import { useAuth } from '../../contexts/AuthContext';


import { decryptQRData, QRData } from '../../src/services/encryption';
import { obtenerPasePorId, actualizarEstadoPase } from '../../src/services/pasesService';

export default function ScannerScreen() {
    const { userData } = useAuth();
    const [scanning, setScanning] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [scanResult, setScanResult] = useState<{
        success: boolean;
        data?: QRData;
        error?: string;
        message?: string;
    }>({ success: false });
    const [validating, setValidating] = useState(false);

    const handleQRScanned = async (qrData: string) => {
        setScanning(false);
        try {
            const decryptedData = decryptQRData(qrData);
            setScanResult({ success: true, data: decryptedData });
        } catch (error) {
            setScanResult({
                success: false,
                error: error instanceof Error ? error.message : 'Código QR inválido'
            });
        }
        setShowResult(true);
    };

    const handleValidatePase = async () => {
        if (!scanResult.data?.paseId) return;

        setValidating(true);
        try {
            const pase = await obtenerPasePorId(scanResult.data.paseId);

            if (!pase) {
                throw new Error("Pase no encontrado en la base de datos.");
            }
            if (pase.estado !== 'activo') {
                throw new Error(`Este pase ya fue ${pase.estado}.`);
            }

            await actualizarEstadoPase(scanResult.data.paseId, 'usado');

            setScanResult({
                ...scanResult,
                success: true,
                message: "¡Pase validado exitosamente!"
            });

        } catch (error) {
            setScanResult({
                ...scanResult,
                success: false,
                error: error instanceof Error ? error.message : 'Error al validar el pase'
            });
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
                success={scanResult.success}
                data={scanResult.data}
                error={scanResult.error}
                message={scanResult.message}
                onClose={resetScanner}
                onValidate={handleValidatePase}
                validating={validating}
                showValidateButton={!!scanResult.data?.paseId && !scanResult.message}
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
