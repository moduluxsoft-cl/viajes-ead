// app/(validator)/scanner.tsx
import React, {useState} from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { QRScanner } from '@/components/QRScanner';
import { ResultModal } from '@/components/ResultModal';
import { useAuth } from '@/contexts/AuthContext';
import {decryptQRData, QRData} from '@/src/services/encryption';
import {
    validarPaseConteo,
    obtenerDetallesCompletosPase,
    Pase,
    Viaje
} from '@/src/services/viajesService';
import {EadLogo} from "@/assets/icons/ead-logo";
import PucvLogo from "@/assets/icons/pucv-logo";

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
        setValidating(true);
        setShowResult(true);

        let decryptedData: Partial<QRData> | null = null;

        try {
            decryptedData = decryptQRData(qrCodeData);

            if (!decryptedData.paseId) {
                throw new Error("El código QR no contiene un ID de pase válido.");
            }

            const { pase, viaje } = await obtenerDetallesCompletosPase(decryptedData.paseId);

            const hoy = new Date();
            const fechaViaje = viaje.fechaViaje;
            if (hoy.toDateString() !== fechaViaje.toDateString()) {
                throw new Error(`Este pase no es para el viaje de hoy. Es para el ${fechaViaje.toLocaleDateString('es-CL')}.`);
            }

            await handleValidatePase(pase, viaje);

        } catch (error) {
            let errorMessage = 'Código QR inválido o error inesperado.';
            if (error instanceof Error) {
                if (error.message.includes("El pase no existe")) {
                    if (decryptedData?.paseId && decryptedData?.fechaViaje) {
                        const fechaDelQR = new Date(decryptedData.fechaViaje).toLocaleDateString('es-CL');
                        errorMessage = `El pase que intentas usar es del viaje pasado del ${fechaDelQR}.`;
                    } else {
                        errorMessage = "Pase no encontrado. Es posible que haya sido generado para un viaje anterior y ya no sea válido.";
                    }
                } else {
                    errorMessage = error.message;
                }
            }

            setScanResult({
                success: false,
                error: errorMessage
            });
            setValidating(false);
        }
    };
    const handleValidatePase = async (pase: Pase, viaje: Viaje) => {
        if (!pase?.id || !userData) return;

        // Pasar los datos del validador
        const validadorData = {
            uid: userData.uid,
            nombre: userData.nombre,
            apellido: userData.apellido
        };

        await validarPaseConteo(pase.id, validadorData).then((validationResult) => {
            setScanResult({ ...validationResult, viaje });
        }).catch(error => {
            setScanResult({ success: false, error: error.message });
        }).finally(() => {
            setValidating(false);
        });
    };

    const resetScanner = () => {
        setShowResult(false);
        setScanResult({ success: false });
        setValidating(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <EadLogo width={40}/>
                <View>
                    <Text style={styles.title}>Validador de Pases</Text>
                    <Text style={styles.subtitle}>Hola {userData?.nombre} {userData?.apellido}!</Text>
                </View>
                <PucvLogo width={40} height={42}/>
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
                validating={validating}
                scanResult={scanResult}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2B2B2B',
        textAlign: 'center',
        paddingBottom: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#2B2B2B',
        textAlign: 'center',
        opacity: 0.9,
    },
    scannerContainer: {
        flex: 1,
    },
});
