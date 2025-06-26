import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Platform } from 'react-native';
// Se cambia la importación de Linking para usar el paquete de Expo, que es más robusto.
import * as Linking from 'expo-linking';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface QRScannerProps {
    onQRScanned: (data: string) => void;
    scanning: boolean;
    onToggleScanning: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({
                                                        onQRScanned,
                                                        scanning,
                                                        onToggleScanning,
                                                    }) => {
    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.infoText}>Solicitando permiso de cámara...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.infoText}>Necesitas dar permiso a la cámara para escanear.</Text>

                {Platform.OS !== 'web' ? (
                    // La llamada a la función es la misma, pero ahora usa el módulo de expo-linking
                    <Button onPress={() => Linking.openSettings()} title="Abrir Configuración" />
                ) : (
                    <Text style={styles.infoText}>Por favor, habilita los permisos de la cámara en la configuración de tu navegador.</Text>
                )}

            </View>
        );
    }

    return (
        <View style={styles.container}>
            {scanning ? (
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={(scanningResult) => {
                        if (scanningResult.data) {
                            onQRScanned(scanningResult.data);
                        }
                    }}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                />
            ) : (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>La cámara está lista para escanear.</Text>
                </View>
            )}

            <View style={styles.buttonContainer}>
                <Button
                    onPress={onToggleScanning}
                    title={scanning ? 'Detener Escaneo' : 'Iniciar Escáner'}
                    color={scanning ? '#ef4444' : '#10b981'}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    placeholderText: {
        color: 'white',
        fontSize: 18,
    },
    infoText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 40,
        width: '80%',
    },
});
