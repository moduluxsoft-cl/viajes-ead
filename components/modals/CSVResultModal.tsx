import React from 'react';
import {FlatList, Modal, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../ui/Button';
import {Card} from '../ui/Card';
import {BatchResult, CSVRow} from '@/src/services/usersService';
import {Ionicons} from '@expo/vector-icons';

interface CSVResultModalProps {
    visible: boolean;
    onClose: () => void;
    result: BatchResult | null;
}

export const CSVResultModal: React.FC<CSVResultModalProps> = ({ visible, onClose, result }) => {
    if (!result) return null;

    const renderErrorItem = ({ item }: { item: { row: number; message: string; data: CSVRow } }) => (
        <View style={styles.errorItem}>
            <Text style={styles.errorRow}>Fila {item.row}: {item.message}</Text>
            <Text style={styles.errorData}>
                Datos: {item.data.nombre}, {item.data.apellido}, {item.data.email}
            </Text>
        </View>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalCenteredView}>
                <SafeAreaView style={styles.modalView}>
                    <Text style={styles.modalTitle}>Resultado de la Carga</Text>

                    <View style={styles.summaryContainer}>
                        <Card style={StyleSheet.flatten([styles.summaryCard, styles.successCard])}>
                            <Ionicons name="checkmark-circle" size={32} color="#15803d" />
                            <Text style={styles.summaryValue}>{result.successCount}</Text>
                            <Text style={styles.summaryLabel}>Usuarios Creados</Text>
                        </Card>
                        <Card style={StyleSheet.flatten([styles.summaryCard, styles.errorCard])}>
                            <Ionicons name="close-circle" size={32} color="#b91c1c" />
                            <Text style={styles.summaryValue}>{result.errorCount}</Text>
                            <Text style={styles.summaryLabel}>Filas con Error</Text>
                        </Card>
                    </View>

                    {result.errorCount > 0 && (
                        <>
                            <Text style={styles.errorListTitle}>Detalle de Errores:</Text>
                            <FlatList
                                data={result.errors}
                                renderItem={renderErrorItem}
                                keyExtractor={(item, index) => `error-${index}`}
                                style={styles.errorList}
                            />
                        </>
                    )}

                    <Button
                        title="Cerrar"
                        onPress={onClose}
                        style={styles.closeButton}
                    />
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalCenteredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalView: {
        height: '85%',
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#111827',
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 8,
        borderWidth: 1,
    },
    successCard: {
        backgroundColor: '#f0fdf4',
        borderColor: '#86efac',
    },
    errorCard: {
        backgroundColor: '#fef2f2',
        borderColor: '#fca5a5',
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 8,
        color: '#1f2937',
    },
    summaryLabel: {
        fontSize: 14,
        color: '#4b5563',
        marginTop: 4,
    },
    errorListTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 10,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 16,
    },
    errorList: {
        flex: 1,
        width: '100%',
    },
    errorItem: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
    },
    errorRow: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#b91c1c',
    },
    errorData: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    closeButton: {
        marginTop: 20,
        backgroundColor: '#667eea',
    },
});
