// src/components/CrearPaseForm.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { crearPase } from '../src/services/pasesService';
import { obtenerConfiguracionViaje, ConfiguracionViaje } from '../src/services/configuracionService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface Props {
    onPaseCreado: (paseId: string) => void;
    onCancel: () => void;
}

export function CrearPaseForm({ onPaseCreado, onCancel }: Props) {
    const { userData } = useAuth();
    const [config, setConfig] = useState<Partial<ConfiguracionViaje>>({});
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const fetchedConfig = await obtenerConfiguracionViaje();
                setConfig(fetchedConfig);
            } catch (error) {
                Alert.alert("Error", "No se pudo cargar la información del viaje.");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleCrearPase = async () => {
        if (!userData?.carrera) {
            Alert.alert(
                "Perfil Incompleto",
                "No tienes una carrera registrada. Por favor, contacta a un administrador para que complete tu perfil."
            );
            return;
        }
        if (!userData) {
            Alert.alert("Error", "No se pudo obtener la información del usuario.");
            return;
        }

        setCreating(true);
        try {
            const paseId = await crearPase(userData);
            Alert.alert("¡Éxito!", "Tu pase se ha generado correctamente.");
            onPaseCreado(paseId);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
            Alert.alert("Error al crear el pase", message);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Cargando información del viaje..." />;
    }

    if (!config.destino || !config.fechaViaje) {
        return (
            <Card style={styles.card}>
                <Text style={styles.infoTitle}>Viaje no disponible</Text>
                <Text style={styles.infoText}>El administrador aún no ha configurado el próximo viaje.</Text>
                <Button title="Volver" onPress={onCancel} style={styles.cancelButton} textStyle={{color: '#6b7280'}}/>
            </Card>
        );
    }

    return (
        <Card style={styles.card}>
            <Text style={styles.formTitle}>Confirmar Reserva</Text>

            <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>Destino:</Text>
                <Text style={styles.infoValue}>{config.destino}</Text>
                <Text style={styles.infoLabel}>Fecha:</Text>
                <Text style={styles.infoValue}>{config.fechaViaje?.toLocaleDateString('es-CL') ?? 'No definida'}</Text>
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>Se usará la siguiente información de tu perfil:</Text>
                <Text style={styles.profileInfo}>Nombre: {userData?.nombre} {userData?.apellido}</Text>
                <Text style={styles.profileInfo}>RUT: {userData?.rut}</Text>
                <Text style={styles.profileInfo}>Carrera: {userData?.carrera || 'No definida'}</Text>
            </View>

            <Button
                title={creating ? "Generando..." : "Confirmar y Generar Pase"}
                onPress={handleCrearPase}
                disabled={creating}
            />
            <Button
                title="Cancelar"
                onPress={onCancel}
                style={styles.cancelButton}
                textStyle={styles.cancelButtonText}
                disabled={creating}
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    card: { padding: 20, backgroundColor: 'white', borderRadius: 12 },
    formTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#1f2937' },
    infoContainer: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 15, marginBottom: 20, },
    infoLabel: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
    infoValue: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 },
    profileInfo: { fontSize: 15, color: '#374151', marginTop: 4 },
    infoTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#1f2937' },
    infoText: { fontSize: 16, textAlign: 'center', color: '#4b5563', marginBottom: 20 },
    cancelButton: { backgroundColor: 'transparent', marginTop: 10, elevation: 0 },
    cancelButtonText: { color: '#6b7280' }
});
