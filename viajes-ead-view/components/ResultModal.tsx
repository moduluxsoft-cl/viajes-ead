import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ResultModalProps {
    visible: boolean;
    success: boolean;
    data?: {
        nombre: string;
        apellido: string;
        rut: string;
        carrera: string;
        fechaViaje: string;
    };
    onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ visible, success, data, onClose }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Card style={styles.modal}>
                    <View style={[styles.iconContainer, success ? styles.successBg : styles.errorBg]}>
                        <Text style={styles.icon}>{success ? '✓' : '✗'}</Text>
                    </View>
                    <Text style={styles.title}>
                        {success ? 'Pase Válido' : 'Pase Inválido'}
                    </Text>
                    {success && data && (
                        <View style={styles.details}>
                            <Text style={styles.detailText}>
                                <Text style={styles.label}>Estudiante: </Text>
                                {data.nombre} {data.apellido}
                            </Text>
                            <Text style={styles.detailText}>
                                <Text style={styles.label}>RUT: </Text>
                                {data.rut}
                            </Text>
                            <Text style={styles.detailText}>
                                <Text style={styles.label}>Carrera: </Text>
                                {data.carrera}
                            </Text>
                            <Text style={styles.detailText}>
                                <Text style={styles.label}>Fecha: </Text>
                                {data.fechaViaje}
                            </Text>
                        </View>
                    )}
                    <Button title="Escanear otro código" onPress={onClose} />
                </Card>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successBg: {
        backgroundColor: '#10b981',
    },
    errorBg: {
        backgroundColor: '#ef4444',
    },
    icon: {
        fontSize: 40,
        color: '#fff',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
    },
    details: {
        width: '100%',
        marginBottom: 20,
    },
    detailText: {
        fontSize: 16,
        color: '#374151',
        marginBottom: 8,
    },
    label: {
        fontWeight: '600',
    },
});
