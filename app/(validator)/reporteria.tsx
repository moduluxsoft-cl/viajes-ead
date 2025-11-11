import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    Platform
} from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { AuditoriaViaje } from '@/src/types/auditoria.types';
import { obtenerReportesAuditoria, exportarReporteCSV } from '@/src/services/reporteriaService';
import { Picker } from '@react-native-picker/picker';
import { IoDownload, IoFilter, IoWarning } from "react-icons/io5";
import DateTimePicker from '@react-native-community/datetimepicker';
import { getPropertyValues } from '@/src/services/configuracionService';

export default function ReporteriaScreen() {
    const { userData } = useAuth();
    const [reportes, setReportes] = useState<AuditoriaViaje[]>([]);
    const [reportesFiltrados, setReportesFiltrados] = useState<AuditoriaViaje[]>([]);
    const [loading, setLoading] = useState(true);
    const [carreras, setCarreras] = useState<string[]>([]);

    // Filtros
    const [mostrarSoloAnomalias, setMostrarSoloAnomalias] = useState(false);
    const [fechaInicio, setFechaInicio] = useState<Date>(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
    );
    const [fechaFin, setFechaFin] = useState<Date>(new Date());
    const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('todas');
    const [showDatePicker, setShowDatePicker] = useState<{
        visible: boolean;
        type: 'inicio' | 'fin';
    }>({ visible: false, type: 'inicio' });

    // Estadísticas
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        ok: 0,
        soloIda: 0,
        soloVuelta: 0,
        sinUso: 0,
        porcentajeOk: 0,
        porcentajeAnomalias: 0
    });

    const cargarReportes = useCallback(async () => {
        setLoading(true);
        try {
            const datos = await obtenerReportesAuditoria(fechaInicio, fechaFin);
            setReportes(datos);
            aplicarFiltros(datos);
        } catch (error) {
            console.error('Error cargando reportes:', error);
        } finally {
            setLoading(false);
        }
    }, [fechaInicio, fechaFin]);

    const cargarCarreras = useCallback(async () => {
        try {
            const carrerasList = await getPropertyValues("CARRERA");
            setCarreras(['todas', ...carrerasList]);
        } catch (error) {
            console.error('Error cargando carreras:', error);
        }
    }, []);

    useEffect(() => {
        cargarReportes();
        cargarCarreras();
    }, []);

    const aplicarFiltros = useCallback((datos: AuditoriaViaje[]) => {
        let filtrados = [...datos];

        // Filtro de anomalías
        if (mostrarSoloAnomalias) {
            filtrados = filtrados.filter(r => r.esAnomalia);
        }

        // Filtro de carrera
        if (carreraSeleccionada !== 'todas') {
            filtrados = filtrados.filter(r => r.carrera === carreraSeleccionada);
        }

        setReportesFiltrados(filtrados);
        calcularEstadisticas(filtrados);
    }, [mostrarSoloAnomalias, carreraSeleccionada]);

    useEffect(() => {
        aplicarFiltros(reportes);
    }, [reportes, mostrarSoloAnomalias, carreraSeleccionada]);

    const calcularEstadisticas = (datos: AuditoriaViaje[]) => {
        const stats = {
            total: datos.length,
            ok: datos.filter(r => r.estadoUso === 'OK').length,
            soloIda: datos.filter(r => r.estadoUso === 'SOLO_IDA').length,
            soloVuelta: datos.filter(r => r.estadoUso === 'SOLO_VUELTA').length,
            sinUso: datos.filter(r => r.estadoUso === 'SIN_USO').length,
            porcentajeOk: 0,
            porcentajeAnomalias: 0
        };

        if (stats.total > 0) {
            stats.porcentajeOk = (stats.ok / stats.total) * 100;
            stats.porcentajeAnomalias = ((stats.total - stats.ok) / stats.total) * 100;
        }

        setEstadisticas(stats);
    };

    const handleExportar = async () => {
        try {
            await exportarReporteCSV(reportesFiltrados, {
                fechaInicio,
                fechaFin,
                carrera: carreraSeleccionada,
                soloAnomalias: mostrarSoloAnomalias
            });
        } catch (error) {
            console.error('Error exportando:', error);
        }
    };

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'OK': return '#10b981';
            case 'SOLO_IDA': return '#f59e0b';
            case 'SOLO_VUELTA': return '#3b82f6';
            case 'SIN_USO': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const renderReporteItem = ({ item }: { item: AuditoriaViaje }) => (
        <Card style={styles.reporteCard}>
            <View style={styles.reporteHeader}>
                <View style={styles.estudianteInfo}>
                    <Text style={styles.nombreEstudiante}>{item.nombreCompleto}</Text>
                    <Text style={styles.rutEstudiante}>RUT: {item.rut}</Text>
                </View>
                {item.esAnomalia && (
                    <IoWarning size={24} color="#f59e0b" />
                )}
            </View>

            <View style={styles.reporteDetails}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Viaje:</Text>
                    <Text style={styles.detailValue}>{item.destino}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fecha:</Text>
                    <Text style={styles.detailValue}>
                        {new Date(item.fechaViaje).toLocaleDateString('es-CL')}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Carrera:</Text>
                    <Text style={styles.detailValue}>{item.carrera}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estado:</Text>
                    <View style={[
                        styles.estadoBadge,
                        { backgroundColor: getEstadoColor(item.estadoUso) }
                    ]}>
                        <Text style={styles.estadoText}>
                            {item.estadoUso.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                {item.motivoAnomalia && (
                    <Text style={styles.motivoAnomalia}>
                        ⚠️ {item.motivoAnomalia}
                    </Text>
                )}
            </View>

            <View style={styles.validacionesContainer}>
                <View style={styles.validacionItem}>
                    <Text style={styles.validacionLabel}>Ida:</Text>
                    <Text style={[
                        styles.validacionStatus,
                        { color: item.validacionIda?.validado ? '#10b981' : '#ef4444' }
                    ]}>
                        {item.validacionIda?.validado ? '✓' : '✗'}
                    </Text>
                    {item.validacionIda?.horaValidacion && (
                        <Text style={styles.horaValidacion}>
                            {new Date(item.validacionIda.horaValidacion)
                                .toLocaleTimeString('es-CL', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                        </Text>
                    )}
                </View>

                <View style={styles.validacionItem}>
                    <Text style={styles.validacionLabel}>Vuelta:</Text>
                    <Text style={[
                        styles.validacionStatus,
                        { color: item.validacionVuelta?.validado ? '#10b981' : '#ef4444' }
                    ]}>
                        {item.validacionVuelta?.validado ? '✓' : '✗'}
                    </Text>
                    {item.validacionVuelta?.horaValidacion && (
                        <Text style={styles.horaValidacion}>
                            {new Date(item.validacionVuelta.horaValidacion)
                                .toLocaleTimeString('es-CL', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                        </Text>
                    )}
                </View>
            </View>
        </Card>
    );

    if (userData?.role !== 'admin') {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>
                    No tienes permisos para ver esta sección
                </Text>
            </SafeAreaView>
        );
    }

    if (loading) {
        return <LoadingSpinner message="Cargando reportes..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Reportería de Auditoría</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{estadisticas.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardOk]}>
                        <Text style={styles.statValue}>{estadisticas.ok}</Text>
                        <Text style={styles.statLabel}>OK</Text>
                        <Text style={styles.statPercent}>
                            {estadisticas.porcentajeOk.toFixed(1)}%
                        </Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardAnomalia]}>
                        <Text style={styles.statValue}>
                            {estadisticas.total - estadisticas.ok}
                        </Text>
                        <Text style={styles.statLabel}>Anomalías</Text>
                        <Text style={styles.statPercent}>
                            {estadisticas.porcentajeAnomalias.toFixed(1)}%
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.filtersContainer}>
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            mostrarSoloAnomalias && styles.filterButtonActive
                        ]}
                        onPress={() => setMostrarSoloAnomalias(!mostrarSoloAnomalias)}
                    >
                        <IoFilter size={20} color={mostrarSoloAnomalias ? '#fff' : '#374151'} />
                        <Text style={[
                            styles.filterButtonText,
                            mostrarSoloAnomalias && styles.filterButtonTextActive
                        ]}>
                            Solo Anomalías
                        </Text>
                    </TouchableOpacity>

                    <Button
                        title="Exportar CSV"
                        onPress={handleExportar}
                        style={styles.exportButton}
                        textStyle={{ fontSize: 14 }}
                    />
                </View>

                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker({ visible: true, type: 'inicio' })}
                    >
                        <Text style={styles.dateButtonText}>
                            Desde: {fechaInicio.toLocaleDateString('es-CL')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker({ visible: true, type: 'fin' })}
                    >
                        <Text style={styles.dateButtonText}>
                            Hasta: {fechaFin.toLocaleDateString('es-CL')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={carreraSeleccionada}
                        onValueChange={setCarreraSeleccionada}
                        style={styles.picker}
                    >
                        {carreras.map(carrera => (
                            <Picker.Item
                                key={carrera}
                                label={carrera === 'todas' ? 'Todas las carreras' : carrera}
                                value={carrera}
                            />
                        ))}
                    </Picker>
                </View>
            </View>

            <FlatList
                data={reportesFiltrados}
                renderItem={renderReporteItem}
                keyExtractor={(item) => `${item.viajeId}_${item.estudianteId}`}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            No se encontraron registros con los filtros aplicados
                        </Text>
                    </View>
                }
            />
            {showDatePicker.visible && (
                <DateTimePicker
                    value={showDatePicker.type === 'inicio' ? fechaInicio : fechaFin}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                        setShowDatePicker({ visible: false, type: 'inicio' });

                        if (event.type === 'set' && selectedDate) {
                            const currentDate = selectedDate;
                            if (showDatePicker.type === 'inicio') {
                                setFechaInicio(currentDate);
                            } else {
                                setFechaFin(currentDate);
                            }
                        }
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    statCardOk: {
        backgroundColor: '#d1fae5',
    },
    statCardAnomalia: {
        backgroundColor: '#fed7aa',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    statPercent: {
        fontSize: 10,
        color: '#4b5563',
        marginTop: 2,
    },
    filtersContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#fff',
        gap: 8,
    },
    filterButtonActive: {
        backgroundColor: '#BE031E',
        borderColor: '#BE031E',
    },
    filterButtonText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    exportButton: {
        flex: 1,
        backgroundColor: '#10b981',
    },
    dateButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#fff',
    },
    dateButtonText: {
        fontSize: 14,
        color: '#374151',
        textAlign: 'center',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    picker: {
        height: 44,
    },
    listContainer: {
        padding: 16,
    },
    reporteCard: {
        marginBottom: 12,
    },
    reporteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    estudianteInfo: {
        flex: 1,
    },
    nombreEstudiante: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    rutEstudiante: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    reporteDetails: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 14,
        color: '#111827',
    },
    estadoBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    estadoText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    motivoAnomalia: {
        fontSize: 12,
        color: '#f59e0b',
        fontStyle: 'italic',
        marginTop: 8,
    },
    validacionesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
    },
    validacionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    validacionLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    validacionStatus: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    horaValidacion: {
        fontSize: 10,
        color: '#9ca3af',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 18,
        color: '#ef4444',
        textAlign: 'center',
        marginTop: 50,
    },
    dateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateModalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 8,
        width: 300,
    },
    dateModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    dateInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
});