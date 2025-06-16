import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './ui/Card';

interface QRDisplayProps {
    data: {
        nombre: string;
        apellido: string;
        rut: string;
        carrera: string;
        fechaViaje: string;
    } | null;
}

export const QRDisplay: React.FC<QRDisplayProps> = ({ data }) => {
    if (!data) {
        return (
            <Card style={styles.container}>
                <View style={styles.qrPlaceholder}>
                    <Text style={styles.qrText}>No data available</Text>
                </View>
            </Card>
        );
    }

    return (
        <Card style={styles.container}>
            <View style={styles.qrPlaceholder}>
                <Text style={styles.qrText}>QR CODE</Text>
            </View>
            <View style={styles.details}>
                <Text style={styles.label}>Nombre:</Text>
                <Text style={styles.value}>{data.nombre} {data.apellido}</Text>
                <Text style={styles.label}>RUT:</Text>
                <Text style={styles.value}>{data.rut}</Text>
                <Text style={styles.label}>Carrera:</Text>
                <Text style={styles.value}>{data.carrera}</Text>
                <Text style={styles.label}>Fecha de Viaje:</Text>
                <Text style={styles.value}>{data.fechaViaje}</Text>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    qrPlaceholder: {
        width: 200,
        height: 200,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: 20,
    },
    qrText: {
        fontSize: 18,
        color: '#6b7280',
        fontWeight: '600',
    },
    details: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
    },
    value: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '500',
        marginBottom: 8,
    },
});
