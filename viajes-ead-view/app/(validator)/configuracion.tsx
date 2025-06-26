// app/(validator)/configuracion.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    Alert,
    Platform,
    ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
    guardarConfiguracionViaje,
    obtenerConfiguracionViaje,
    ConfiguracionViaje,
} from '../../src/services/configuracionService';

export default function ConfiguracionScreen() {
    const { userData } = useAuth();
    const [config, setConfig] = useState<Partial<ConfiguracionViaje>>({});

    // Estados separados para manejar el texto de los inputs en la web
    const [dateText, setDateText] = useState('');
    const [timeText, setTimeText] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const [showPicker, setShowPicker] = useState(false);

    // Efecto para cargar la configuración inicial
    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const existingConfig = await obtenerConfiguracionViaje();
                if (existingConfig) {
                    setConfig(existingConfig);
                    if (existingConfig.fechaViaje instanceof Date && !isNaN(existingConfig.fechaViaje.getTime())) {
                        const date = existingConfig.fechaViaje;
                        setDateText(date.toISOString().split('T')[0]);
                        setTimeText(date.toTimeString().slice(0, 5));
                    }
                }
            } catch (error) {
                Alert.alert("Error", "No se pudo cargar la configuración existente.");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleGuardar = async () => {
        let configToSave = { ...config };

        if (Platform.OS === 'web') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateText) && /^\d{2}:\d{2}$/.test(timeText)) {
                const newDate = new Date(`${dateText}T${timeText}:00`);
                if (!isNaN(newDate.getTime())) {
                    configToSave.fechaViaje = newDate;
                } else {
                    Alert.alert("Fecha inválida", "El formato de fecha u hora es incorrecto.");
                    return;
                }
            } else {
                Alert.alert("Formato incorrecto", "Por favor, usa el formato AAAA-MM-DD para la fecha y HH:MM para la hora.");
                return;
            }
        }

        const dateToValidate = configToSave.fechaViaje;
        const isValid = dateToValidate instanceof Date && !isNaN(dateToValidate.getTime());

        if (!configToSave.capacidadMaxima || !isValid || !configToSave.destino) {
            Alert.alert("Datos incompletos", "Por favor, completa todos los campos con valores válidos.");
            return;
        }

        setSaving(true);
        try {
            await guardarConfiguracionViaje(configToSave);
            setConfig(configToSave);
            setSuccessMessage('¡Configuración guardada con éxito!');
            setTimeout(() => setSuccessMessage(''), 3000);        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocurrió un error.";
            Alert.alert("Error al guardar", message);
        } finally {
            setSaving(false);
        }
    };

    const onDateTimeChange = (_event: any, selectedValue?: Date) => {
        setShowPicker(Platform.OS === 'ios');
        if (!selectedValue) return;

        const currentOrNewDate = config.fechaViaje || new Date();
        const updatedDate = new Date(currentOrNewDate);

        if (pickerMode === 'date') {
            updatedDate.setFullYear(selectedValue.getFullYear(), selectedValue.getMonth(), selectedValue.getDate());
        } else {
            updatedDate.setHours(selectedValue.getHours(), selectedValue.getMinutes());
        }

        setConfig(prev => ({ ...prev, fechaViaje: updatedDate }));
        setDateText(updatedDate.toISOString().split('T')[0]);
        setTimeText(updatedDate.toTimeString().slice(0, 5));
    };

    const isValidDate = config.fechaViaje instanceof Date && !isNaN(config.fechaViaje.getTime());
    const openPicker = (mode: 'date' | 'time') => { setPickerMode(mode); setShowPicker(true); };
    if (loading) { return <LoadingSpinner message="Cargando configuración..." />; }
    if (userData?.role !== 'admin') { return <SafeAreaView style={styles.container}><Text style={styles.errorText}>No tienes permiso.</Text></SafeAreaView>; }
    const displayDate = config.fechaViaje?.toLocaleDateString('es-CL') ?? 'Seleccionar fecha';
    const displayTime = config.fechaViaje?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) ?? 'Seleccionar hora';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Configuración del Viaje</Text>

                <Card style={styles.card}>
                    <Text style={styles.label}>Capacidad Máxima</Text>
                    <TextInput style={styles.input} placeholder="Ej: 100" keyboardType="number-pad" value={config.capacidadMaxima?.toString() || ''} onChangeText={(text) => setConfig(prev => ({ ...prev, capacidadMaxima: Number(text) || undefined }))} />

                    <Text style={styles.label}>Destino del Viaje</Text>
                    <TextInput style={styles.input} placeholder="Ej: Santiago" value={config.destino || ''} onChangeText={(text) => setConfig(prev => ({ ...prev, destino: text }))} />

                    {Platform.OS === 'web' ? (
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                            <View style={{flex: 1, marginRight: 8}}>
                                <Text style={styles.label}>Fecha</Text>
                                <TextInput style={styles.input} placeholder="AAAA-MM-DD" value={dateText} onChangeText={setDateText} />
                            </View>
                            <View style={{flex: 1, marginLeft: 8}}>
                                <Text style={styles.label}>Hora</Text>
                                <TextInput style={styles.input} placeholder="HH:MM" value={timeText} onChangeText={setTimeText} />
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.label}>Fecha y Hora del Viaje</Text>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                <Button title={displayDate} onPress={() => openPicker('date')} style={[styles.dateButton, {flex: 1, marginRight: 8}]} textStyle={styles.dateButtonText} />
                                <Button title={displayTime} onPress={() => openPicker('time')} style={[styles.dateButton, {flex: 1, marginLeft: 8}]} textStyle={styles.dateButtonText} />
                            </View>
                            {showPicker && (
                                <DateTimePicker
                                    value={config.fechaViaje || new Date()}
                                    mode={pickerMode}
                                    is24Hour={true}
                                    display="default"
                                    onChange={onDateTimeChange}
                                />
                            )}
                        </>
                    )}
                </Card>
                {successMessage ? (
                    <View style={styles.successContainer}>
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}
                <Button title={saving ? "Guardando..." : "Guardar Configuración"} onPress={handleGuardar} disabled={saving} style={styles.saveButton} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 20, textAlign: 'center' },
    card: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 16, color: '#111827' },
    dateButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
    dateButtonText: { color: '#111827' },
    saveButton: { backgroundColor: '#667eea' },
    disabledButton: { backgroundColor: '#a5b4fc' },
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
});
