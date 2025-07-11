// app/(student)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert,
    RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { QRGenerator } from '../../components/QRGenerator';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

import {
    obtenerPasesEstudiante,
    Pase,
    obtenerViajeActivo,
    Viaje,
    crearPase
} from '../../src/services/viajesService';

export default function StudentHomeScreen() {
    const { userData, logout, loading: authLoading } = useAuth();

    const [viajeActivo, setViajeActivo] = useState<Viaje | null>(null);
    const [currentPase, setCurrentPase] = useState<Pase | null>(null);
    const [isCreatingPase, setIsCreatingPase] = useState(false);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadInitialData = useCallback(async () => {
        if (!userData?.uid) return;

        setLoading(true);
        setError(null);

        try {
            const viaje = await obtenerViajeActivo();
            setViajeActivo(viaje);

            if (!viaje) {
                setError('Actualmente no hay ningún viaje programado.');
                return;
            }

            const pases = await obtenerPasesEstudiante(userData.uid);
            const paseActivoParaViajeActual = pases.find(p => p.estado === 'activo' && p.viajeId === viaje.id);
            setCurrentPase(paseActivoParaViajeActual || null);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [userData?.uid]);

    useEffect(() => {
        if (!authLoading && userData?.uid) {
            loadInitialData();
        }
    }, [authLoading, userData?.uid, loadInitialData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    };

    const handleCrearPase = async () => {
        if (!viajeActivo || !userData) return;

        setIsCreatingPase(true);
        try {
            await crearPase(userData, viajeActivo);
            Alert.alert('¡Éxito!', 'Tu pase se ha generado correctamente.');
            await loadInitialData(); // Recarga la información para mostrar el QR
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo crear el pase.';
            Alert.alert('Error', message);
        } finally {
            setIsCreatingPase(false);
        }
    };

    if (authLoading || (loading && !refreshing)) {
        return <LoadingSpinner message="Cargando tu información..." />;
    }

    return (
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
            <SafeAreaView style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <View style={styles.header}>
                        <Text style={styles.welcomeText}>Bienvenido/a, {userData?.nombre}</Text>
                        <Button title="Cerrar Sesión" onPress={logout} style={styles.logoutButton} />
                    </View>

                    {error && (
                        <Card style={styles.warningCard}><Text style={styles.warningText}>{error}</Text></Card>
                    )}

                    {currentPase && viajeActivo ? (
                        <Card style={styles.qrCard}>
                            <Text style={styles.cardTitle}>Tu Pase Actual</Text>
                            <QRGenerator data={currentPase.qrData} size={200} />
                            <View style={styles.paseDetails}>
                                <Text style={styles.detailLabel}>Destino:</Text>
                                <Text style={styles.detailValue}>{viajeActivo.destino}</Text>
                                <Text style={styles.detailLabel}>Fecha de Viaje:</Text>
                                <Text style={styles.detailValue}>{viajeActivo.fechaViaje.toLocaleDateString('es-CL')}</Text>
                            </View>
                        </Card>
                    ) : (
                        viajeActivo && (
                            <Card style={styles.emptyCard}>
                                <Text style={styles.emptyTitle}>No tienes pase activo</Text>
                                <Text style={styles.emptySubtitle}>Crea uno para generar tu código QR.</Text>
                                <Button
                                    title={isCreatingPase ? "Generando..." : "Crear Nuevo Pase"}
                                    onPress={handleCrearPase}
                                    style={styles.createButton}
                                    disabled={isCreatingPase}
                                />
                            </Card>
                        )
                    )}

                    {!viajeActivo && !loading && (
                        <Card style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>Viaje no disponible</Text>
                            <Text style={styles.emptySubtitle}>El administrador aún no ha configurado el próximo viaje.</Text>
                            <Button
                                title="Creación de pases desactivada"
                                style={styles.disabledButton}
                                disabled={true} onPress={function (): void {
                                throw new Error('Function not implemented.');
                            }}                            />
                        </Card>
                    )}
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: { flex: 1 },
    scrollContent: { padding: 16, flexGrow: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    logoutButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    warningCard: {
        backgroundColor: '#fef3cd',
        borderColor: '#fbbf24',
        borderWidth: 1,
        marginBottom: 20,
        padding: 16,
    },
    warningText: {
        color: '#92400e',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    qrCard: { alignItems: 'center', marginBottom: 20 },
    emptyCard: { alignItems: 'center', marginBottom: 20, padding: 32 },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    createButton: { backgroundColor: '#667eea' },
    disabledButton: {
        backgroundColor: '#9ca3af',
        opacity: 0.6,
    },
    paseDetails: { width: '100%', marginTop: 20 },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        marginTop: 8,
    },
    detailValue: { fontSize: 16, color: '#111827', marginBottom: 8 },
});
