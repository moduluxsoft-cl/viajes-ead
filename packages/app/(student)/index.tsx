// app/(student)/index.tsx
import React, {useCallback, useEffect, useState} from 'react';
import {RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '@shared/contexts/AuthContext';
import {QRGenerator} from '@shared/components/QRGenerator';
import {Card} from '@shared/components/ui/Card';
import {Button} from '@shared/components/ui/Button';
import {LoadingSpinner} from '@shared/components/ui/LoadingSpinner';
import {crearPase, obtenerPasesEstudiante, obtenerViajeActivo, Pase, Viaje} from '@shared/services/viajesService';
import {toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {getServerTimeFromHeader} from "@shared/services/utilsService";
import {functions} from '@shared/config/firebase';
import Head from "expo-router/head";

export default function StudentHomeScreen() {
    const { userData, loading: authLoading } = useAuth();
    const enviarCorreoConQR = functions.httpsCallable("enviarCorreoConQR");

    const [viajeActivo, setViajeActivo] = useState<Viaje | null>(null);
    const [currentPase, setCurrentPase] = useState<Pase | null>(null);
    const [isCreatingPase, setIsCreatingPase] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);


    const generationBlockedMessage = 'La generación de pases está cerrada. '
    const loadInitialData = useCallback(async () => {
        if (!userData?.uid) return;
        setLoading(true);
        setError(null);
        try {
            const viaje = await obtenerViajeActivo();
            setViajeActivo(viaje);
            if (!viaje) {
                setError('Actualmente no hay ningún viaje programado.');
                return;
            }
            const pases = await obtenerPasesEstudiante(userData.uid);
            const paseActivoParaViajeActual = pases.find(p => (p.estado === 'activo' || p.estado === 'usado') && p.viajeId === viaje.id);
            setCurrentPase(paseActivoParaViajeActual || null);
            const serverTime = await getServerTimeFromHeader();
            const serverUtc = new Date(serverTime);
            const diaSemana = serverUtc.getDay();
            const hora = serverUtc.getHours();
            setIsBlocked(
                (diaSemana === 3 && hora >= 13) ||
                (diaSemana === 4 && hora < 19)
            )
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [userData?.uid]);

    useEffect(() => {
        if (!authLoading && userData?.uid) {
            loadInitialData();
        }
    }, [authLoading, userData?.uid, loadInitialData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    };

    const handleCrearPase = async () => {
        if (!viajeActivo || !userData) return;
        setIsCreatingPase(true);

        await crearPase(userData, viajeActivo).then(async ({paseId, encryptedQRData}) => {
            await enviarCorreoConQR({email: userData.email, contenidoQR: encryptedQRData}).then(async (res) => {
                toast.success('¡Éxito! Tu pase se ha generado correctamente, se te ha enviado un correo con el QR adjunto.');
            }).catch(async (error) => {
                toast.success('¡Éxito! Tu pase se ha generado correctamente, pero hubo un error al enviar el QR adjunto. Puedes seguir ocupando el QR disponible aquí.');
            })
        }).catch(async (error) => {
            toast.error('Error generando el pase: ' + error.message);
        }).finally(async () => {
            await loadInitialData();
            setIsCreatingPase(false);
        });
    };

    if (authLoading || (loading && !refreshing)) {
        return <LoadingSpinner message="Cargando tu información..." />;
    }

    return (
        <React.Fragment>
            <Head>
                <title>Viajes EAD | Pases</title>
                <meta name="description" content="Sistema de Pases Escolares" />
            </Head>
            <View style={styles.gradient}>
                <SafeAreaView style={styles.container}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    >
                        {error && (
                            <Card style={styles.warningCard}><Text style={styles.warningText}>{error}</Text></Card>
                        )}

                        {currentPase && viajeActivo ? (
                            <Card style={styles.qrCard}>
                                <Text style={styles.cardTitle}>Tu Pase Actual</Text>
                                <QRGenerator data={currentPase.qrData} size={200} />
                                <View style={styles.paseDetails}>
                                    <Text style={styles.detailLabel}>Destino:</Text>
                                    <Text style={styles.detailValue}>{viajeActivo.destino}</Text>
                                    <Text style={styles.detailLabel}>Fecha de Viaje:</Text>
                                    <Text style={styles.detailValue}>{viajeActivo.fechaViaje.toLocaleDateString('es-CL')}</Text>
                                </View>
                            </Card>
                        ) : (
                            viajeActivo && (
                                <Card style={styles.emptyCard}>
                                    <Text style={styles.emptyTitle}>No tienes pase activo</Text>
                                    <Text style={styles.emptySubtitle}>Crea uno para generar tu código QR.</Text>
                                    {
                                        isBlocked ? (
                                            <View style={styles.blockedContainer}>
                                                <Text style={styles.blockedMessage}>{generationBlockedMessage}</Text>
                                            </View>
                                        ) : (
                                            <Button
                                                title={isCreatingPase ? "Generando..." : "Crear Nuevo Pase"}
                                                onPress={handleCrearPase}
                                                style={styles.createButton}
                                                disabled={isCreatingPase}
                                            />
                                        )}
                                </Card>
                            )
                        )}

                        {!viajeActivo && !loading && (
                            <Card style={styles.emptyCard}>
                                <Text style={styles.emptyTitle}>Viaje no disponible</Text>
                                <Text style={styles.emptySubtitle}>El administrador aún no ha configurado el próximo viaje.</Text>
                                <Button
                                    title="Creación de pases desactivada"
                                    style={styles.disabledButton}
                                    disabled={true}
                                    onPress={() => {}}
                                />
                            </Card>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </View>
        </React.Fragment>
    );
}

// Los estilos permanecen mayormente iguales, solo eliminamos los que no se usan.
const styles = StyleSheet.create({
    gradient: { flex: 1, backgroundColor: '#E4E4E4FF' },
    container: { flex: 1 },
    scrollContent: { padding: 16, flexGrow: 1 },
    // Se eliminan los estilos 'header', 'welcomeText' y 'logoutButton'
    warningCard: {
        backgroundColor: '#fef3cd',
        borderColor: '#fbbf24',
        borderWidth: 1,
        marginBottom: 20,
        padding: 16,
    },
    warningText: {
        color: '#92400e',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    qrCard: { alignItems: 'center', marginBottom: 20 },
    emptyCard: { alignItems: 'center', marginBottom: 20, padding: 32 },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    createButton: { backgroundColor: '#BE031E' },
    disabledButton: {
        backgroundColor: '#BA5766',
        opacity: 0.6,
    },
    paseDetails: { width: '100%', marginTop: 20 },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        marginTop: 8,
    },
    detailValue: { fontSize: 16, color: '#111827', marginBottom: 8 },
    blockedContainer: {
        width: '100%',
        backgroundColor: '#fffbe5',
        borderColor: '#fde047',
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    blockedMessage: {
        color: '#a16207',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '500',
    },
});
