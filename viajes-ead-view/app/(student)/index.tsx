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
import { CrearPaseForm } from '../../components/CrearPaseForm';
import { QRGenerator } from '../../components/QRGenerator';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
    obtenerPasesEstudiante,
    Pase,
    obtenerViajeActivo,
    Viaje
} from '../../src/services/viajesService';

export default function StudentHomeScreen() {
    const { userData, logout, loading: authLoading } = useAuth();

    // Estados para manejar la información del viaje y del pase del usuario
    const [viajeActivo, setViajeActivo] = useState<Viaje | null>(null);
    const [currentPase, setCurrentPase] = useState<Pase | null>(null);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadInitialData = useCallback(async () => {
        if (!userData?.uid) return;

        setLoading(true);
        setError(null);
        setViajeActivo(null);
        setCurrentPase(null);

        try {
            // 1. Primero, obtenemos el viaje activo. Es el dato principal.
            const viaje = await obtenerViajeActivo();
            setViajeActivo(viaje);

            // Si no hay viaje, no tiene sentido continuar.
            if (!viaje) {
                setError('Actualmente no hay ningún viaje programado. Inténtalo más tarde.');
                setLoading(false);
                return;
            }

            // 2. Si hay un viaje, buscamos los pases del estudiante.
            const pases = await obtenerPasesEstudiante(userData.uid);

            // 3. Buscamos un pase activo que corresponda al ID del viaje activo.
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

    const handlePaseCreado = async () => {
        setShowCreateForm(false);
        await loadInitialData(); // Recarga toda la información
    };

    // Muestra un spinner mientras se autentica o se cargan los datos por primera vez
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

                    {/* Muestra un error solo si no hay un viaje activo */}
                    {error && !viajeActivo && (
                        <Card style={styles.warningCard}><Text style={styles.warningText}>{error}</Text></Card>
                    )}

                    {/* --- LÓGICA DE VISUALIZACIÓN --- */}

                    {/* Caso 1: El usuario tiene un pase activo para el viaje actual */}
                    {currentPase && viajeActivo ? (
                        <Card style={styles.qrCard}>
                            <Text style={styles.cardTitle}>Tu Pase Actual</Text>
                            <QRGenerator data={currentPase.qrData} size={200} />
                            <View style={styles.paseDetails}>
                                <Text style={styles.detailLabel}>Destino:</Text>
                                <Text style={styles.detailValue}>{viajeActivo.destino}</Text>
                                <Text style={styles.detailLabel}>Fecha de Viaje:</Text>
                                <Text style={styles.detailValue}>{viajeActivo.fechaViaje.toLocaleDateString('es-CL')}</Text>
                                <Text style={styles.detailLabel}>Estado:</Text>
                                <Text style={[styles.detailValue, styles.statusActive]}>{currentPase.estado.toUpperCase()}</Text>
                            </View>
                        </Card>
                    ) : (
                        <>
                            {/* Caso 2: El usuario no tiene pase, se le muestra el formulario de creación */}
                            {showCreateForm ? (
                                <CrearPaseForm onPaseCreado={handlePaseCreado} onCancel={() => setShowCreateForm(false)} />
                            ) : (
                                /* Caso 3: El usuario no tiene pase y no está en el formulario, se le muestra el botón para crear */
                                <Card style={styles.emptyCard}>
                                    <Text style={styles.emptyTitle}>No tienes pases activos</Text>
                                    <Text style={styles.emptySubtitle}>Crea un nuevo pase para generar tu código QR</Text>
                                    <Button
                                        title="Crear Nuevo Pase"
                                        onPress={() => setShowCreateForm(true)}
                                        style={[styles.createButton, !viajeActivo && styles.disabledButton]}
                                        disabled={!viajeActivo}
                                    />
                                    {!viajeActivo && <Text style={styles.disabledText}>La creación de pases está desactivada</Text>}
                                </Card>
                            )}
                        </>
                    )}

                    <Card style={styles.profileCard}>
                        <Text style={styles.cardTitle}>Tu Información</Text>
                        <View style={styles.profileDetails}>
                            <Text style={styles.profileLabel}>RUT:</Text>
                            <Text style={styles.profileValue}>{userData?.rut || 'No definido'}</Text>
                            <Text style={styles.profileLabel}>Carrera:</Text>
                            <Text style={styles.profileValue}>{userData?.carrera || 'No definida'}</Text>
                            <Text style={styles.profileLabel}>Rol:</Text>
                            <Text style={styles.profileValue}>{userData?.role || 'No definido'}</Text>
                        </View>
                    </Card>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: { flex: 1 },
    scrollContent: { padding: 16 },
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
    disabledText: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
    paseDetails: { width: '100%', marginTop: 20 },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        marginTop: 8,
    },
    detailValue: { fontSize: 16, color: '#111827', marginBottom: 8 },
    statusActive: {
        color: '#10b981',
        fontWeight: 'bold'
    },
    profileCard: { marginBottom: 20 },
    profileDetails: { width: '100%' },
    profileLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        marginTop: 8,
    },
    profileValue: { fontSize: 16, color: '#111827', marginBottom: 8 },
});
