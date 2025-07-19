// app/(validator)/configuracion.tsx
import React, {useCallback, useEffect, useState} from 'react';
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import {useAuth} from '@/contexts/AuthContext';
import {Card} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import {Ionicons} from '@expo/vector-icons';
import {obtenerViajeActivo, sobrescribirViajeActivo, Viaje} from '@/src/services/viajesService';
import {EadLogo} from "@/assets/icons/ead-logo";
import PucvLogo from "@/assets/icons/pucv-logo";
import {toast} from "react-toastify";

// El tipo de dato para el formulario solo incluye los campos editables.
type ViajeFormData = {
    destino: string;
    capacidadMaxima: number;
};

export default function ConfiguracionScreen() {
    const { userData } = useAuth();

    // Estado solo para los campos del formulario.
    const [formData, setFormData] = useState<ViajeFormData>({
        destino: '',
        capacidadMaxima: 0,
    });
    // Estado para guardar la información del viaje activo actual.
    const [activeTrip, setActiveTrip] = useState<Viaje | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Función para formatear la fecha a dd/mm/yyyy
    const formatDateToString = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses son 0-indexados
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const loadActiveTrip = useCallback(async () => {
        setLoading(true);
        try {
            const viaje = await obtenerViajeActivo();
            setActiveTrip(viaje); // Guardamos el viaje activo completo

            if (viaje) {
                // Si hay un viaje activo, poblamos el formulario con sus datos.
                setFormData({
                    destino: viaje.destino,
                    capacidadMaxima: viaje.capacidadMaxima,
                });
            } else {
                // Si no hay viaje, reseteamos el formulario.
                setFormData({
                    destino: '',
                    capacidadMaxima: 0,
                });
            }
        } catch (error) {
            console.error("Error al cargar viaje activo:", error);
            toast.error(`Error: No se pudo cargar la configuración del viaje activo.`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadActiveTrip();
    }, [loadActiveTrip]);

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
            // Creamos el objeto a guardar combinando los datos del form con la fecha actual.
            const dataToSave = {
                ...formData,
                fechaViaje: new Date(), // La fecha siempre es la de hoy.
            };

            await sobrescribirViajeActivo(dataToSave);
            setSuccessMessage('¡La configuración del viaje se ha guardado con éxito!');
            await loadActiveTrip(); // Recargamos para mostrar la info actualizada
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
            <View style={styles.header}>
                <EadLogo width={40}/>
                <View>
                    <Text style={styles.title}>Configuraciones Viaje</Text>
                    <Text style={styles.subtitle}>Parámetros del próximo viaje disponible.</Text>
                </View>
                <PucvLogo width={40} height={42}/>
            </View>
            <ScrollView>
                <View style={styles.innerDiv}>
                    {/* Sección informativa del viaje activo */}
                    {activeTrip && (
                        <Card style={styles.activeTripInfoCard}>
                            <Text style={styles.activeTripTitle}>Viaje Activo Actual</Text>
                            <Text style={styles.activeTripText}>Destino: {activeTrip.destino}</Text>
                            <Text style={styles.activeTripText}>Fecha: {formatDateToString(activeTrip.fechaViaje)}</Text>
                            <Text style={styles.activeTripText}>Capacidad: {activeTrip.capacidadMaxima}</Text>
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
                            <Ionicons name="information-circle" size={24} color="#C4B000" />
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
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    innerDiv: { padding: 20 },
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
        backgroundColor: '#BE031E'
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
    // Estilos para la nueva tarjeta de información del viaje activo
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
    }
});
