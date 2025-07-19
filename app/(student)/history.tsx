// app/(student)/history.tsx
import React, {useCallback, useEffect, useState} from 'react';
import {Alert, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View,} from 'react-native';
import {Card} from '@/components/ui/Card';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import {useAuth} from '@/contexts/AuthContext';
// Importamos todo desde el nuevo servicio central
import {obtenerPasesEstudiante, obtenerViajesPorIds, Pase, Viaje} from '@/src/services/viajesService';

// Creamos una nueva interfaz para combinar los datos del pase y los detalles de su viaje
interface PaseConDetalles extends Pase {
    detallesViaje?: Viaje;
}

export default function HistoryScreen() {
    const { userData } = useAuth();
    const [pases, setPases] = useState<PaseConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadPases = useCallback(async () => {
        if (!userData?.uid) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // 1. Obtenemos todos los pases del estudiante
            const pasesData = await obtenerPasesEstudiante(userData.uid);
            if (pasesData.length === 0) {
                setPases([]);
                setLoading(false);
                return;
            }

            // 2. Recopilamos los IDs únicos de los viajes asociados a esos pases
            const viajeIds = [...new Set(pasesData.map(p => p.viajeId).filter(Boolean))];

            // 3. Obtenemos los detalles de todos esos viajes en una sola consulta
            const viajesMap = await obtenerViajesPorIds(viajeIds);

            // 4. Unimos la información del pase con los detalles de su viaje
            const pasesConDetalles = pasesData.map(pase => ({
                ...pase,
                detallesViaje: viajesMap.get(pase.viajeId),
            }));

            setPases(pasesConDetalles);
        } catch (error) {
            console.error('Error loading pases:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            Alert.alert('Error', `No se pudieron cargar los pases: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [userData?.uid]);

    useEffect(() => {
        if (userData?.uid) {
            loadPases();
        }
    }, [userData?.uid, loadPases]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPases();
        setRefreshing(false);
    };

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'activo': return '#10b981';
            case 'usado': return '#6b7280';
            case 'expirado': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusText = (estado: string) => {
        return estado.toUpperCase();
    };

    const renderPase = ({ item }: { item: PaseConDetalles }) => (
        <Card style={styles.paseCard}>
            <View style={styles.paseHeader}>
                <Text style={styles.destination}>{item.detallesViaje?.destino || 'Destino no disponible'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
                    <Text style={styles.statusText}>{getStatusText(item.estado)}</Text>
                </View>
            </View>

            <View style={styles.paseDetails}>
                <Text style={styles.detailLabel}>Fecha de viaje:</Text>
                <Text style={styles.detailValue}>
                    {item.detallesViaje ? item.detallesViaje.fechaViaje.toLocaleDateString('es-CL') : 'Fecha no disponible'}
                </Text>

                <Text style={styles.detailLabel}>Nombre completo:</Text>
                <Text style={styles.detailValue}>{item.nombreCompleto}</Text>

                <Text style={styles.detailLabel}>RUT:</Text>
                <Text style={styles.detailValue}>{item.rut}</Text>

                <Text style={styles.detailLabel}>Generado el:</Text>
                <Text style={styles.detailValue}>
                    {item.fechaCreacion.toLocaleDateString('es-CL')} a las {item.fechaCreacion.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
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
        borderRadius: 12, // Bordes más redondeados
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    paseDetails: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
        marginTop: 8,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        color: '#111827',
        marginBottom: 10,
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
