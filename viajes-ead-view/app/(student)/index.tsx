// app/(student)/index.tsx
import React, { useState, useEffect } from 'react';
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
import { obtenerPasesEstudiante, Pase } from '../../src/services/pasesService';
import { obtenerConfiguracionViaje } from '../../src/services/configuracionService';

export default function StudentHomeScreen() {
    const { userData, logout, loading: authLoading } = useAuth();
    const [currentPase, setCurrentPase] = useState<Pase | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && userData?.uid) {
            loadActivePase();
            checkConfiguration();
        }
    }, [authLoading, userData?.uid]);

    const checkConfiguration = async () => {
        try {
            const config = await obtenerConfiguracionViaje();

            if (!config.destino || !config.fechaViaje || !config.capacidadMaxima) {
                setConfigError('La configuración del viaje está incompleta. Contacta al administrador.');
                return;
            }

            // Verificar si la fecha del viaje es válida
            const fechaViaje = new Date(config.fechaViaje);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            if (fechaViaje < hoy) {
                setConfigError('La fecha del viaje ya ha pasado.');
                return;
            }

            setConfigError(null);
        } catch (error) {
            console.error('Error verificando configuración:', error);
            setConfigError('No se pudo verificar la configuración del viaje.');
        }
    };

    const loadActivePase = async () => {
        if (!userData?.uid) {
            console.warn('loadActivePase: No se puede ejecutar porque userData.uid no está disponible.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const pases = await obtenerPasesEstudiante(userData.uid);
            console.log(`loadActivePase: Se encontraron ${pases.length} pases en total para el usuario.`);

            // Buscar el pase activo
            const activePase = pases.find((pase: Pase) => pase.estado === 'activo');

            if (activePase) {
                console.log(`¡Éxito! Pase activo encontrado con ID: ${activePase.id}. Se mostrará el QR.`);
                setCurrentPase(activePase);
            } else {
                console.log('No se encontró ningún pase con estado "activo".');
                setCurrentPase(null);
            }
        } catch (error) {
            console.error('Error en loadActivePase:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setError(`No se pudieron cargar los pases: ${errorMessage}`);

            // Solo mostrar alert si es un error grave
            if (errorMessage.includes('permission-denied') || errorMessage.includes('unauthenticated')) {
                Alert.alert('Error de autenticación', 'Por favor, cierra sesión e inicia sesión nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            loadActivePase(),
            checkConfiguration()
        ]);
        setRefreshing(false);
    };

    const handlePaseCreado = async (paseId: string) => {
        console.log(`handlePaseCreado: El pase con ID ${paseId} fue creado. Ahora se intentará recargar.`);
        setShowCreateForm(false);
        await loadActivePase();
    };

    const handleLogout = async () => {
        Alert.alert(
            'Cerrar Sesión',
            '¿Estás seguro de que quieres cerrar sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cerrar Sesión', onPress: logout, style: 'destructive' }
            ]
        );
    };

    const formatFechaViaje = (fechaString: string) => {
        try {
            // Si ya está en formato DD/MM/YYYY, lo devolvemos tal como está
            if (fechaString.includes('/')) return fechaString;

            // Si viene en otro formato, intentamos convertirlo
            const fecha = new Date(fechaString);
            return fecha.toLocaleDateString('es-CL');
        } catch {
            return fechaString;
        }
    };

    // Loading state mientras se autentica
    if (authLoading) {
        return <LoadingSpinner message="Cargando..." />;
    }

    return (
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
            <SafeAreaView style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    <View style={styles.header}>
                        <Text style={styles.welcomeText}>
                            Bienvenido/a, {userData?.nombre}
                        </Text>
                        <Button
                            title="Cerrar Sesión"
                            onPress={handleLogout}
                            style={styles.logoutButton}
                        />
                    </View>

                    {/* Mostrar error de configuración si existe */}
                    {configError && (
                        <Card style={styles.warningCard}>
                            <Text style={styles.warningTitle}>Aviso</Text>
                            <Text style={styles.warningText}>{configError}</Text>
                        </Card>
                    )}

                    {/* Mostrar error si existe */}
                    {error && (
                        <Card style={styles.errorCard}>
                            <Text style={styles.errorText}>{error}</Text>
                            <Button
                                title="Reintentar"
                                onPress={loadActivePase}
                                style={styles.retryButton}
                                textStyle={styles.retryButtonText}
                            />
                        </Card>
                    )}


                    {loading && !refreshing && (
                        <LoadingSpinner message="Cargando tus pases..." />
                    )}


                    {!loading && currentPase && (
                        <Card style={styles.qrCard}>
                            <Text style={styles.cardTitle}>Tu Pase Actual</Text>
                            <QRGenerator data={currentPase.qrData} size={200} />
                            <View style={styles.paseDetails}>
                                <Text style={styles.detailLabel}>Destino:</Text>
                                <Text style={styles.detailValue}>{currentPase.destino}</Text>
                                <Text style={styles.detailLabel}>Fecha de Viaje:</Text>
                                <Text style={styles.detailValue}>{formatFechaViaje(currentPase.fechaViaje)}</Text>
                                <Text style={styles.detailLabel}>Estado:</Text>
                                <Text style={[styles.detailValue, styles.statusActive]}>
                                    {currentPase.estado.toUpperCase()}
                                </Text>
                            </View>
                        </Card>
                    )}

                    {!loading && !currentPase && (
                        <>
                            {showCreateForm ? (
                                <CrearPaseForm
                                    onPaseCreado={handlePaseCreado}
                                    onCancel={() => setShowCreateForm(false)}
                                />
                            ) : (
                                <Card style={styles.emptyCard}>
                                    <Text style={styles.emptyTitle}>No tienes pases activos</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Crea un nuevo pase de viaje para generar tu código QR
                                    </Text>
                                    <Button
                                        title="Crear Nuevo Pase"
                                        onPress={() => setShowCreateForm(true)}
                                        style={[styles.createButton, configError && styles.disabledButton]}
                                        disabled={!!configError}
                                    />
                                    {configError && (
                                        <Text style={styles.disabledText}>
                                            No se pueden crear pases en este momento
                                        </Text>
                                    )}
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
    errorCard: {
        backgroundColor: '#fee2e2',
        borderColor: '#fca5a5',
        borderWidth: 1,
        marginBottom: 20,
        padding: 16,
    },
    warningCard: {
        backgroundColor: '#fef3cd',
        borderColor: '#fbbf24',
        borderWidth: 1,
        marginBottom: 20,
        padding: 16,
    },
    warningTitle: {
        color: '#92400e',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    warningText: {
        color: '#92400e',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#dc2626',
        paddingVertical: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
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