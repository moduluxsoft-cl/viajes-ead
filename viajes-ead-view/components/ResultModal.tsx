import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { QRData } from '../src/services/encryption';

interface ResultModalProps {
    visible: boolean;
    success: boolean;
    data?: QRData;
    error?: string;
    message?: string;
    onClose: () => void;
    onValidate?: () => void;
    validating?: boolean; // Prop para el estado de carga del botón
    showValidateButton?: boolean;
}

export const ResultModal: React.FC<ResultModalProps> = ({
                                                            visible,
                                                            success,
                                                            data,
                                                            error,
                                                            message, // Se añade a la desestructuración
                                                            onClose,
                                                            onValidate,
                                                            validating = false, // Se añade a la desestructuración
                                                            showValidateButton = false
                                                        }) => {
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('es-CL');
        } catch {
            return dateString;
        }
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('es-CL');
    };

    const modalTitle = message ? 'Resultado de Validación' : (success ? 'Pase Válido' : 'Pase Inválido');

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Card style={styles.modal}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={[
                            styles.iconContainer,
                            success ? styles.successBg : styles.errorBg
                        ]}>
                            <Text style={styles.icon}>
                                {success ? '✓' : '✗'}
                            </Text>
                        </View>

                        <Text style={styles.title}>{modalTitle}</Text>

                        {message && (
                            <Text style={styles.successMessage}>{message}</Text>
                        )}

                        {success && data ? (
                            <View style={styles.details}>
                                <DetailRow label="Estudiante" value={`${data.nombre} ${data.apellido}`} />
                                <DetailRow label="RUT" value={data.rut} />
                                <DetailRow label="Carrera" value={data.carrera} />
                                <DetailRow label="Fecha de Viaje" value={data.fechaViaje} />
                            </View>
                        ) : (
                            !message && (
                                <Text style={styles.errorMessage}>
                                    {error || 'Código QR inválido o expirado'}
                                </Text>
                            )
                        )}

                        <View style={styles.buttonContainer}>
                            {success && showValidateButton && onValidate && (
                                <Button
                                    title="Validar Pase"
                                    onPress={onValidate}
                                    loading={validating} // Se usa la prop 'validating'
                                    style={[styles.button, styles.validateButton]}
                                />
                            )}
                            <Button
                                title="Cerrar"
                                onPress={onClose}
                                style={[styles.button, styles.closeButton]}
                            />
                        </View>
                    </ScrollView>
                </Card>
            </View>
        </Modal>
    );
};

interface DetailRowProps {
    label: string;
    value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
    <View style={styles.detailRow}>
        <Text style={styles.label}>{label}:</Text>
        <Text style={styles.value}>{value}</Text>
    </View>
);

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
        maxHeight: '80%',
        padding: 24,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        alignSelf: 'center',
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
        textAlign: 'center',
    },
    details: {
        marginBottom: 20,
    },
    detailRow: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        color: '#111827',
    },
    successMessage: {
        fontSize: 16,
        color: '#059669',
        textAlign: 'center',
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#d1fae5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    errorMessage: {
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    buttonContainer: {
        gap: 12,
        marginTop: 8,
    },
    button: {
        marginVertical: 0,
    },
    validateButton: {
        backgroundColor: '#10b981',
    },
    closeButton: {
        backgroundColor: '#6b7280',
    },
});

