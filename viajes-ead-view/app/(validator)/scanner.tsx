import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/ui/Header';
import { ScannerFrame } from '../../components/ScannerFrame';
import { ResultModal } from '../../components/ResultModal';
import { Button } from '../../components/ui/Button';

const mockQRData = {
    nombre: 'Juan',
    apellido: 'Pérez',
    rut: '12.345.678-9',
    carrera: 'Ingeniería Civil',
    fechaViaje: '15/01/2025',
};

export default function ScannerScreen() {
    const router = useRouter();
    const [showResult, setShowResult] = useState(false);
    const [isValid, setIsValid] = useState(true);

    const handleLogout = () => {
        router.replace('/login');
    };

    const handleScan = () => {
        // Simular escaneo aleatorio
        setIsValid(Math.random() > 0.3);
        setShowResult(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header
                title="Inspector García"
                rightAction={{ label: 'Salir', onPress: handleLogout }}
            />
            <View style={styles.content}>
                <View style={styles.cameraPlaceholder}>
                    <ScannerFrame />
                </View>
                <Button
                    title="Simular Escaneo"
                    onPress={handleScan}
                    style={styles.scanButton}
                />
            </View>
            <ResultModal
                visible={showResult}
                success={isValid}
                data={isValid ? mockQRData : undefined}
                onClose={() => setShowResult(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    cameraPlaceholder: {
        flex: 1,
        backgroundColor: '#374151',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    scanButton: {
        marginBottom: 20,
    },
});
