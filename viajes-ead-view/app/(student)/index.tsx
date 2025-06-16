import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/ui/Header';
import { StudentForm } from '../../components/forms/StudentForm';
import { QRDisplay } from '../../components/QRDisplay';
import { StudentFormData } from '../../components/forms/StudentForm';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function StudentScreen() {
    const router = useRouter();
    const [showQR, setShowQR] = useState(false);
    const [qrData, setQRData] = useState<StudentFormData | null>(null);

    const handleLogout = () => {
        router.replace('/login');
    };

    const handleGenerateQR = (data: StudentFormData) => {
        setQRData(data);
        setShowQR(true);
    };

    const handleNewPass = () => {
        setShowQR(false);
        setQRData(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header
                title="Bienvenido Juan"
                rightAction={{ label: 'Salir', onPress: handleLogout }}
            />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {!showQR ? (
                    <Card style={styles.formCard}>
                        <StudentForm onSubmit={handleGenerateQR} />
                    </Card>
                ) : (
                    <View style={styles.qrContainer}>
                        <QRDisplay data={qrData} />
                        <View style={styles.actions}>
                            <Button
                                title="Enviar por Correo"
                                variant="secondary"
                                onPress={() => {}}
                                style={styles.actionButton}
                            />
                            <Button
                                title="Generar Otro Pase"
                                onPress={handleNewPass}
                                style={styles.actionButton}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>
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
    formCard: {
        marginTop: 20,
    },
    qrContainer: {
        marginTop: 20,
    },
    actions: {
        marginTop: 20,
    },
    actionButton: {
        marginBottom: 12,
    },
});
