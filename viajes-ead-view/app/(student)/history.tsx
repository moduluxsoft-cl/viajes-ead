import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    RefreshControl,
    Alert,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { obtenerPasesEstudiante, Pase } from '../../src/services/pasesService';

export default function HistoryScreen() {
    const { userData } = useAuth();
    const [pases, setPases] = useState<Pase[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (userData?.uid) {
            loadPases();
        }
    }, [userData?.uid]);

    const loadPases = async () => {
        if (!userData?.uid) {
            setLoading(false);
            return;
        }

        try {
            const pasesData = await obtenerPasesEstudiante(userData.uid);
            setPases(pasesData);
        } catch (error) {
            console.error('Error loading pases:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            Alert.alert('Error', `No se pudieron cargar los pases: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPases();
        setRefreshing(false);
    };

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'activo':
                return '#10b981';
            case 'usado':
                return '#6b7280';
            case 'expirado':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    const getStatusText = (estado: string) => {
        switch (estado) {
            case 'activo':
                return 'ACTIVO';
            case 'usado':
                return 'USADO';
            case 'expirado':
                return 'EXPIRADO';
            default:
                return estado.toUpperCase();
        }
    };

    const renderPase = ({ item }: { item: Pase }) => (
        <Card style={styles.paseCard}>
            <View style={styles.paseHeader}>
                <Text style={styles.destination}>{item.destino}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
                    <Text style={styles.statusText}>{getStatusText(item.estado)}</Text>
                </View>
            </View>

            <View style={styles.paseDetails}>
                <Text style={styles.detailLabel}>Fecha de viaje:</Text>
                <Text style={styles.detailValue}>{item.fechaViaje}</Text>

                <Text style={styles.detailLabel}>Nombre completo:</Text>
                <Text style={styles.detailValue}>{item.nombreCompleto}</Text>

                <Text style={styles.detailLabel}>RUT:</Text>
                <Text style={styles.detailValue}>{item.rut}</Text>

                <Text style={styles.detailLabel}>Creado:</Text>
                <Text style={styles.detailValue}>
                    {item.fechaCreacion.toLocaleDateString('es-CL')} a las {item.fechaCreacion.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </Text>

                <Text style={styles.detailLabel}>Expira:</Text>
                <Text style={styles.detailValue}>
                    {item.fechaExpiracion.toLocaleDateString('es-CL')}
                </Text>
            </View>
        </Card>
    );

    if (loading) {
        return <LoadingSpinner message="Cargando historial..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Historial de Pases</Text>
                <Text style={styles.subtitle}>
                    {pases.length} {pases.length === 1 ? 'pase registrado' : 'pases registrados'}
                </Text>
            </View>

            <FlatList
                data={pases}
                renderItem={renderPase}
                keyExtractor={(item) => item.id!}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No tienes pases registrados</Text>
                        <Text style={styles.emptySubtext}>
                            Crea tu primer pase desde la pantalla principal
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        backgroundColor: '#667eea',
        padding: 20,
        paddingTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginTop: 4,
    },
    listContainer: {
        padding: 16,
        flexGrow: 1,
    },
    paseCard: {
        marginBottom: 12,
        padding: 16,
    },
    paseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    destination: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    paseDetails: {
        gap: 8,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 14,
        color: '#111827',
        marginBottom: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
    },
});