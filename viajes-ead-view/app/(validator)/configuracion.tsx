// app/(validator)/configuracion.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    Alert,
    Platform,
    ScrollView,
    TouchableOpacity,
    Modal,
    Pressable
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import {
    obtenerViajeActivo,
    sobrescribirViajeActivo,
    Viaje
} from '../../src/services/viajesService';

type ViajeFormData = Omit<Viaje, 'id' | 'pasesGenerados' | 'estado'>;

export default function ConfiguracionScreen() {
    const { userData } = useAuth();

    const [formData, setFormData] = useState<Partial<ViajeFormData>>({});

    const [fechaString, setFechaString] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    /**
     * Convierte una fecha Date a string en formato DD/MM/YYYY
     */
    const formatDateToString = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    /**
     * Parsea un string en formato DD/MM/YYYY a Date con hora 08:00
     */
    const parseStringToDate = (dateString: string): Date | null => {
        const parts = dateString.split('/');
        if (parts.length !== 3) return null;

        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
        if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2020 || year > 2030) return null;

        const date = new Date(year, month, day, 8, 0, 0);

        if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
            return null;
        }

        return date;
    };

    /**
     * Maneja el cambio en el input de fecha
     */
    const handleDateChange = (text: string) => {
        const cleaned = text.replace(/[^0-9/]/g, '');

        let formatted = cleaned;
        if (cleaned.length === 2 && !cleaned.includes('/')) {
            formatted = cleaned + '/';
        } else if (cleaned.length === 5 && cleaned.lastIndexOf('/') === 2) {
            formatted = cleaned + '/';
        }

        if (formatted.length <= 10) {
            setFechaString(formatted);

            if (formatted.length === 10) {
                const parsedDate = parseStringToDate(formatted);
                if (parsedDate) {
                    setFormData(prev => ({ ...prev, fechaViaje: parsedDate }));
                }
            }
        }
    };

    const loadActiveTrip = useCallback(async () => {
        setLoading(true);
        try {
            const viaje = await obtenerViajeActivo(); // Devuelve un objeto con claves en minúscula
            if (viaje) {
                setFormData({
                    destino: viaje.destino,
                    capacidadMaxima: viaje.capacidadMaxima,
                    fechaViaje: viaje.fechaViaje,
                });
                setFechaString(formatDateToString(viaje.fechaViaje));
            } else {
                const hoy = new Date();
                setFormData({
                    fechaViaje: hoy,
                    destino: '',
                    capacidadMaxima: undefined,
                });
                setFechaString(formatDateToString(hoy));
            }
        } catch (error) {
            console.error("Error al cargar viaje activo:", error);
            Alert.alert("Error", "No se pudo cargar la configuración del viaje activo.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadActiveTrip();
    }, [loadActiveTrip]);

    const handleSave = () => {
        console.log('handleSave iniciado');
        console.log('formData:', formData);
        console.log('fechaString:', fechaString);

        if (!formData.fechaViaje || !fechaString) {
            console.log('Error: fecha no definida');
            Alert.alert("Fecha inválida", "Por favor, ingresa una fecha válida en formato DD/MM/YYYY.");
            return;
        }

        const parsedDate = parseStringToDate(fechaString);
        if (!parsedDate) {
            console.log('Error: fecha no válida después de parsear');
            Alert.alert("Fecha inválida", "La fecha ingresada no es válida. Usa el formato DD/MM/YYYY.");
            return;
        }

        if (!formData.capacidadMaxima || !formData.destino) {
            console.log('Error: campos incompletos', { capacidad: formData.capacidadMaxima, destino: formData.destino });
            Alert.alert("Datos incompletos", "Por favor, completa todos los campos del formulario.");
            return;
        }

        setShowConfirmModal(true);
    };

    const executeSave = async () => {
        console.log('executeSave iniciado');
        setShowConfirmModal(false);
        setSaving(true);
        setSuccessMessage('');
        try {
            console.log('Datos a guardar:', formData);
            // Se pasa el objeto formData directamente. El servicio se encarga de la traducción.
            await sobrescribirViajeActivo(formData as ViajeFormData);
            console.log('Guardado exitoso');
            setSuccessMessage('¡La configuración del viaje se ha guardado con éxito!');
            // Recargamos los datos para ver los cambios reflejados en el formulario
            await loadActiveTrip();
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error) {
            console.error('Error al guardar:', error);
            const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            Alert.alert("Error al guardar", message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Cargando configuración actual..." />;
    }

    if (userData?.role !== 'admin') {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>No tienes permiso para acceder a esta sección.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Configuración del Viaje Activo</Text>
                <Text style={styles.subtitle}>Aquí puedes ver, modificar o crear el próximo viaje disponible para reservas.</Text>

                <Card style={styles.card}>
                    <Text style={styles.label}>Capacidad Máxima</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: 300"
                        keyboardType="number-pad"
                        value={formData.capacidadMaxima?.toString() || ''}
                        onChangeText={(text) => {
                            const num = parseInt(text, 10);
                            console.log('Capacidad cambiada:', text, 'parseado a:', num);
                            setFormData(prev => ({ ...prev, capacidadMaxima: isNaN(num) ? undefined : num }));
                        }}
                    />

                    <Text style={styles.label}>Destino del Viaje</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: Campus Coquimbo"
                        value={formData.destino || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, destino: text }))}
                    />

                    <Text style={styles.label}>Fecha del Viaje</Text>
                    <View style={styles.dateInputContainer}>
                        <TextInput
                            style={[styles.input, styles.dateInput]}
                            placeholder="DD/MM/YYYY"
                            value={fechaString}
                            onChangeText={handleDateChange}
                            keyboardType="numeric"
                            maxLength={10}
                        />
                        <View style={styles.calendarIcon}>
                            <Ionicons name="calendar" size={24} color="#6b7280" />
                        </View>
                    </View>
                    <Text style={styles.helperText}>La hora se establecerá automáticamente a las 08:00 AM</Text>

                    {formData.fechaViaje && (
                        <View style={styles.datePreview}>
                            <Text style={styles.datePreviewLabel}>Vista previa:</Text>
                            <Text style={styles.datePreviewValue}>
                                {formData.fechaViaje.toLocaleDateString('es-CL', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Text>
                        </View>
                    )}
                </Card>

                {successMessage ? (
                    <View style={styles.successContainer}>
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}

                <Button
                    title={saving ? "Guardando..." : "Guardar y Sobrescribir Viaje"}
                    onPress={() => {
                        console.log('Botón presionado');
                        handleSave();
                    }}
                    disabled={saving}
                    style={styles.saveButton}
                />

                <Card style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="information-circle" size={24} color="#3b82f6" />
                        <Text style={styles.infoTitle}>Información Importante</Text>
                    </View>
                    <Text style={styles.infoText}>
                        • Solo puede existir un viaje activo a la vez{'\n'}
                        • Al guardar, el viaje anterior será cancelado automáticamente{'\n'}
                        • Los pases del viaje anterior quedarán inválidos{'\n'}
                        • Los estudiantes deberán generar nuevos pases
                    </Text>
                </Card>
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
                            Guardar esta configuración cancelará cualquier viaje activo anterior y sus pases.
                            ¿Estás seguro de que quieres continuar?
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
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
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
    dateInputContainer: {
        position: 'relative',
        marginBottom: 4,
    },
    dateInput: {
        paddingRight: 45,
        marginBottom: 0,
    },
    calendarIcon: {
        position: 'absolute',
        right: 12,
        top: 12,
    },
    helperText: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    datePreview: {
        backgroundColor: '#f3f4f6',
        padding: 12,
        borderRadius: 6,
        marginTop: 8,
    },
    datePreviewLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    datePreviewValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    saveButton: { backgroundColor: '#667eea' },
    errorText: { textAlign: 'center', marginTop: 50, fontSize: 18, color: '#ef4444' },
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
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        marginBottom: 24,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e40af',
        marginLeft: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#111827',
    },
    modalMessage: {
        fontSize: 16,
        marginBottom: 25,
        textAlign: 'center',
        color: '#4b5563',
        lineHeight: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#e5e7eb',
    },
    cancelButtonText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 16,
    },
    confirmButton: {
        backgroundColor: '#dc2626',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});