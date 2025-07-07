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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import {
    obtenerViajeActivo,
    sobrescribirViajeActivo,
    Viaje
} from '../../src/services/viajesService';

type ViajeFormData = Omit<Viaje, 'id' | 'pasesGenerados' | 'estado'>;

// Componente para el input de fecha en web (versión simple y funcional)
const WebDateInput = ({ value, onChange }: {
    value: Date | undefined,
    onChange: (date: Date) => void
}) => {
    const formatDateForInput = (date: Date | undefined) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <input
            type="date"
            value={formatDateForInput(value)}
            onChange={(e) => {
                if (e.target.value) {
                    // El input devuelve la fecha en UTC, la convertimos a local
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    date.setHours(8, 0, 0, 0);
                    onChange(date);
                }
            }}
            min={formatDateForInput(new Date())}
            // Estilos básicos para que sea funcional, pero no alineado
            style={{
                fontSize: 16,
                padding: 12,
                border: '1px solid #ccc',
                borderRadius: 8,
                marginBottom: 16
            }}
        />
    );
};

export default function ConfiguracionScreen() {
    const { userData } = useAuth();

    const [formData, setFormData] = useState<Partial<ViajeFormData>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);

    const formatDateToString = (date: Date): string => {
        return date.toLocaleDateString('es-CL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const loadActiveTrip = useCallback(async () => {
        setLoading(true);
        try {
            const viaje = await obtenerViajeActivo();
            if (viaje) {
                setFormData({
                    destino: viaje.destino,
                    capacidadMaxima: viaje.capacidadMaxima,
                    fechaViaje: viaje.fechaViaje,
                });
            } else {
                const hoy = new Date();
                hoy.setHours(8, 0, 0, 0);
                setFormData({
                    fechaViaje: hoy,
                    destino: '',
                    capacidadMaxima: undefined,
                });
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

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (event.type === 'set' && selectedDate) {
            const newDate = new Date(selectedDate);
            newDate.setHours(8, 0, 0, 0);
            setFormData(prev => ({ ...prev, fechaViaje: newDate }));
        }
    };

    const handleWebDateChange = (date: Date) => {
        setFormData(prev => ({ ...prev, fechaViaje: date }));
    };

    const handleSave = () => {
        if (!formData.fechaViaje || !formData.capacidadMaxima || !formData.destino) {
            Alert.alert("Datos incompletos", "Por favor, completa todos los campos del formulario.");
            return;
        }
        setShowConfirmModal(true);
    };

    const executeSave = async () => {
        setShowConfirmModal(false);
        setSaving(true);
        setSuccessMessage('');
        try {
            await sobrescribirViajeActivo(formData as ViajeFormData);
            setSuccessMessage('¡La configuración del viaje se ha guardado con éxito!');
            await loadActiveTrip();
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            Alert.alert("Error al guardar", message);
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
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Configuración del Viaje Activo</Text>
                <Text style={styles.subtitle}>Define los parámetros del próximo viaje disponible.</Text>

                <Card style={styles.card}>
                    <Text style={styles.label}>Capacidad Máxima</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: 300"
                        keyboardType="number-pad"
                        value={formData.capacidadMaxima?.toString() || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, capacidadMaxima: parseInt(text) || undefined }))}
                    />

                    <Text style={styles.label}>Destino del Viaje</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: Campus Coquimbo"
                        value={formData.destino || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, destino: text }))}
                    />

                    <Text style={styles.label}>Fecha del Viaje</Text>

                    {Platform.OS === 'web' ? (
                        <WebDateInput
                            value={formData.fechaViaje}
                            onChange={handleWebDateChange}
                        />
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                                <Ionicons name="calendar" size={20} color="#374151" />
                                <Text style={styles.datePickerButtonText}>
                                    {formData.fechaViaje ? formatDateToString(formData.fechaViaje) : 'Seleccionar fecha'}
                                </Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={formData.fechaViaje || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                />
                            )}
                        </>
                    )}

                    <Text style={styles.helperText}>La hora se establecerá automáticamente a las 08:00 AM.</Text>
                </Card>

                {successMessage ? (
                    <View style={styles.successContainer}>
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}

                <Button
                    title={saving ? "Guardando..." : "Guardar y Sobrescribir Viaje"}
                    onPress={handleSave}
                    disabled={saving}
                    style={styles.saveButton}
                />

                <Card style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="information-circle" size={24} color="#3b82f6" />
                        <Text style={styles.infoTitle}>Información Importante</Text>
                    </View>
                    <View>
                        {infoItems.map((item, index) => (
                            <Text key={index} style={styles.infoText}>• {item}</Text>
                        ))}
                    </View>
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
    container: {
        flex: 1,
        backgroundColor: '#f9fafb'
    },
    scrollContent: {
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20
    },
    card: {
        marginBottom: 24
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8
    },
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
    helperText: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
        fontStyle: 'italic',
        marginTop: 4
    },
    saveButton: {
        backgroundColor: '#667eea'
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
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        marginBottom: 24,
        marginTop: 16
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e40af',
        marginLeft: 8
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
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        gap: 12,
        minHeight: 50
    },
    datePickerButtonText: {
        fontSize: 16,
        color: '#111827'
    }
});
