import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useAuth} from '@shared/contexts/AuthContext';
import {Card} from '@shared/components/ui/Card';
import {Button} from '@shared/components/ui/Button';
import {LoadingSpinner} from '@shared/components/ui/LoadingSpinner';
import {
    obtenerEstadisticasPases,
    obtenerViajeActivo,
    sobrescribirViajeActivo,
    Viaje
} from '@shared/services/viajesService';
import {toast} from "react-toastify";
import {IoInformationCircle} from "react-icons/io5";

type ViajeFormData = {
    destino: string;
    capacidadMaxima: number;
};

interface PaseStats {
    totalPasesGenerados: number;
    estudiantesUnicosConQR: number;
    pasesUsadosUnaVez: number;
    pasesUsadosDosVeces: number;
}

export default function ConfiguracionScreen() {
    const { userData } = useAuth();

    const [formData, setFormData] = useState<ViajeFormData>({
        destino: '',
        capacidadMaxima: 0,
    });
    const [activeTrip, setActiveTrip] = useState<Viaje | null>(null);
    const [paseStats, setPaseStats] = useState<PaseStats | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const formatDateToString = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const loadActiveTripAndStats = useCallback(async () => {
        setLoading(true);
        try {
            const viaje = await obtenerViajeActivo();
            setActiveTrip(viaje);

            if (viaje) {
                setFormData({
                    destino: viaje.destino,
                    capacidadMaxima: viaje.capacidadMaxima,
                });
                const stats = await obtenerEstadisticasPases(viaje.id);
                setPaseStats(stats);
            } else {
                setFormData({
                    destino: '',
                    capacidadMaxima: 0,
                });
                setPaseStats(null);
            }
        } catch (error) {
            toast.error(`Error: No se pudo cargar la configuración del viaje activo o las estadísticas.`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadActiveTripAndStats();
    }, [loadActiveTripAndStats]);

    const handleSave = () => {
        if (!formData.destino || !formData.capacidadMaxima || formData.capacidadMaxima <= 0) {
            toast.info("Datos incompletos: Por favor, completa un destino y una capacidad máxima válida.");
            return;
        }
        setShowConfirmModal(true);
    };

    const executeSave = async () => {
        setShowConfirmModal(false);
        setSaving(true);
        setSuccessMessage('');
        try {
            const dataToSave = {
                ...formData
            };

            await sobrescribirViajeActivo(dataToSave);
            setSuccessMessage('¡La configuración del viaje se ha guardado con éxito!');
            await loadActiveTripAndStats(); // Recargamos para mostrar la info actualizada y las estadísticas
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            toast.error("Error al guardar" + message);
        } finally {
            setSaving(false);
        }
    };

    const infoItems = [
        'Solo puede existir un viaje activo a la vez.',
        'Al guardar, el viaje anterior será cancelado.',
        'Los pases del viaje anterior quedarán inválidos.'
    ];

    if (loading) return <LoadingSpinner message="Cargando configuración actual..." />;
    if (userData?.role !== 'admin') return (<SafeAreaView style={styles.container}><Text style={styles.errorText}>No tienes permiso para acceder.</Text></SafeAreaView>);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.innerDiv}>
                    {activeTrip && (
                        <Card style={styles.activeTripInfoCard}>
                            <Text style={styles.activeTripTitle}>Viaje Activo Actual</Text>
                            <Text style={styles.activeTripText}>Destino: {activeTrip.destino}</Text>
                            <Text style={styles.activeTripText}>Fecha: {formatDateToString(activeTrip.fechaViaje)}</Text>
                            <Text style={styles.activeTripText}>Capacidad: {activeTrip.capacidadMaxima}</Text>
                        </Card>
                    )}

                    {paseStats && (
                        <Card style={styles.statsCard}>
                            <Text style={styles.statsTitle}>Estadísticas de Pases (Viaje Actual)</Text>
                            <Text style={styles.statsText}>Estudiantes con QR generados: {paseStats.estudiantesUnicosConQR}</Text>
                            <Text style={styles.statsText}>Pases usados 1 vez: {paseStats.pasesUsadosUnaVez}</Text>
                            <Text style={styles.statsText}>Pases usados 2 veces: {paseStats.pasesUsadosDosVeces}</Text>
                        </Card>
                    )}

                    <Card style={styles.card}>
                        <Text style={styles.label}>Capacidad Máxima</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 300"
                            keyboardType="number-pad"
                            value={formData.capacidadMaxima?.toString() || ''}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, capacidadMaxima: parseInt(text) || 0 }))}
                        />

                        <Text style={styles.label}>Destino del Viaje</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Campus Coquimbo"
                            value={formData.destino || ''}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, destino: text }))}
                        />
                    </Card>

                    <Card style={styles.infoCard}>
                        <View style={styles.infoHeader}>
                            <IoInformationCircle size={24} color="#C4B000" />
                            <Text style={styles.infoTitle}>Información Importante</Text>
                        </View>
                        <View>
                            {infoItems.map((item, index) => (
                                <Text key={index} style={styles.infoText}>• {item}</Text>
                            ))}
                        </View>
                    </Card>
                    <Button
                        title={saving ? "Guardando..." : "Guardar y Sobrescribir Viaje"}
                        onPress={handleSave}
                        disabled={saving}
                        style={styles.saveButton}
                    />
                </View>

                {successMessage ? (
                    <View style={styles.successContainer}>
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}
            </ScrollView>

            <Modal
                transparent={true}
                animationType="fade"
                visible={showConfirmModal}
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirmar Acción</Text>
                        <Text style={styles.modalMessage}>
                            Guardar esta configuración cancelará cualquier viaje activo anterior. ¿Continuar?
                        </Text>
                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={executeSave}
                            >
                                <Text style={styles.confirmButtonText}>Sí, Guardar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E4E4E4FF' },
    innerDiv: { padding: 20 },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2B2B2B',
        textAlign: 'center',
        paddingBottom: 1,
        maxWidth: 250,
    },
    subtitle: {
        fontSize: 16,
        color: '#2B2B2B',
        textAlign: 'center',
        opacity: 0.9,
        maxWidth: 250,
    },
    card: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#d1d5db',
        marginBottom: 16,
        color: '#111827'
    },
    saveButton: {
        backgroundColor: '#BE031E',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
        elevation: 2,
    },
    errorText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 18,
        color: '#ef4444'
    },
    successContainer: {
        backgroundColor: '#dcfce7',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#4ade80'
    },
    successText: {
        color: '#166534',
        textAlign: 'center',
        fontWeight: 'bold'
    },
    infoCard: {
        backgroundColor: '#FFFEF2',
        borderColor: '#C4B000',
        borderWidth: 1,
        marginBottom: 30,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#C4B000',
        marginLeft: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#C4B000',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        width: '90%',
        maxWidth: 400,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
            }
        })
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#111827'
    },
    modalMessage: {
        fontSize: 16,
        marginBottom: 25,
        textAlign: 'center',
        color: '#4b5563',
        lineHeight: 24
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center'
    },
    cancelButton: {
        backgroundColor: '#e5e7eb'
    },
    cancelButtonText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 16
    },
    confirmButton: {
        backgroundColor: '#dc2626'
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16
    },
    activeTripInfoCard: {
        marginBottom: 24,
        backgroundColor: '#eef2ff',
        borderColor: '#818cf8',
        borderWidth: 1,
    },
    activeTripTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4338ca',
        marginBottom: 8,
    },
    activeTripText: {
        fontSize: 14,
        color: '#4f46e5',
        lineHeight: 20,
    },
    statsCard: {
        marginBottom: 24,
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
        borderWidth: 1,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#16a34a',
        marginBottom: 8,
    },
    statsText: {
        fontSize: 14,
        color: '#15803d',
        lineHeight: 20,
    },
});
