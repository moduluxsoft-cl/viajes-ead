import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView } from 'react-native';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
// Importamos las interfaces que necesitamos desde el servicio
import { Pase, Viaje } from '../src/services/viajesService';

// 1. Definimos el tipo para el objeto scanResult que viene del scanner
type ScanResult = {
    success: boolean;
    pase?: Pase;
    viaje?: Viaje;
    error?: string;
    message?: string;
};

// 2. Actualizamos las props del Modal para que acepte el objeto scanResult
interface ResultModalProps {
    visible: boolean;
    onClose: () => void;
    onValidate: () => void;
    validating: boolean;
    scanResult: ScanResult;
    showValidateButton: boolean;
}

export const ResultModal: React.FC<ResultModalProps> = ({
                                                            visible,
                                                            onClose,
                                                            onValidate,
                                                            validating,
                                                            scanResult,
                                                            showValidateButton,
                                                        }) => {
    // 3. Desestructuramos las propiedades desde el objeto scanResult
    const { success, pase, viaje, error, message } = scanResult;

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
                        <View style={[styles.iconContainer, success ? styles.successBg : styles.errorBg]}>
                            <Text style={styles.icon}>{success ? '✓' : '✗'}</Text>
                        </View>

                        <Text style={styles.title}>{modalTitle}</Text>

                        {/* Si hay un mensaje final (ej: "Pase validado"), lo mostramos */}
                        {message && (
                            <Text style={styles.successMessage}>{message}</Text>
                        )}

                        {/* Si el escaneo inicial fue exitoso, mostramos los detalles del pase y el viaje */}
                        {success && pase && viaje ? (
                            <View style={styles.details}>
                                <DetailRow label="Estudiante" value={pase.nombreCompleto} />
                                <DetailRow label="RUT" value={pase.rut} />
                                <DetailRow label="Destino del Viaje" value={viaje.destino} />
                                <DetailRow label="Fecha del Viaje" value={viaje.fechaViaje.toLocaleDateString('es-CL')} />
                                <DetailRow label="Estado Actual" value={pase.estado.toUpperCase()} />
                            </View>
                        ) : (
                            // Si no fue exitoso y no hay mensaje final, mostramos el error
                            !message && (
                                <Text style={styles.errorMessage}>
                                    {error || 'Código QR inválido o expirado'}
                                </Text>
                            )
                        )}

                        <View style={styles.buttonContainer}>
                            {/* El botón de validar se muestra si el escaneo fue exitoso y no hay un mensaje final */}
                            {success && showValidateButton && (
                                <Button
                                    title="Confirmar Validación"
                                    onPress={onValidate}
                                    loading={validating}
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

// Componente auxiliar para mostrar las filas de detalles (sin cambios)
const DetailRow: React.FC<{ label: string; value: string; }> = ({ label, value }) => (
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
