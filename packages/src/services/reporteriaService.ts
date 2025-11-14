import { collection, doc, getDoc, getDocs, orderBy, query, where, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { AuditoriaViaje } from '@shared/types/auditoria.types';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';

export async function obtenerReportesAuditoria(
    fechaInicio: Date,
    fechaFin: Date
): Promise<AuditoriaViaje[]> {
    const inicioDelDia = new Date(fechaInicio);
    inicioDelDia.setHours(0, 0, 0, 0);

    const finDelDia = new Date(fechaFin);
    finDelDia.setHours(23, 59, 59, 999);

    try {
        const q = query(
            collection(db, 'auditoria_viajes'),
            where('fechaViaje', '>=', Timestamp.fromDate(inicioDelDia)),
            where('fechaViaje', '<=', Timestamp.fromDate(finDelDia)),
            orderBy('fechaViaje', 'desc')
        );
        const querySnapshot = await getDocs(q);

        const reportes: AuditoriaViaje[] = querySnapshot.docs.map((snap) => {
            const data: any = snap.data();
            return {
                id: snap.id,
                ...data,
                fechaViaje: data.fechaViaje?.toDate ? data.fechaViaje.toDate() : data.fechaViaje,
                fechaGeneracion: data.fechaGeneracion?.toDate ? data.fechaGeneracion.toDate() : data.fechaGeneracion,
                validacionIda: {
                    ...data.validacionIda,
                    horaValidacion: data.validacionIda?.horaValidacion?.toDate ? data.validacionIda.horaValidacion.toDate() : data.validacionIda?.horaValidacion
                },
                validacionVuelta: {
                    ...data.validacionVuelta,
                    horaValidacion: data.validacionVuelta?.horaValidacion?.toDate ? data.validacionVuelta.horaValidacion.toDate() : data.validacionVuelta?.horaValidacion
                },
                fechaConsolidacion: data.fechaConsolidacion?.toDate ? data.fechaConsolidacion.toDate() : data.fechaConsolidacion
            } as AuditoriaViaje;
        });

        return reportes;
    } catch (error) {
        console.error('Error obteniendo reportes:', error);
        throw error;
    }
}

export async function exportarReporteCSV(
    datos: AuditoriaViaje[],
    filtros: {
        fechaInicio: Date;
        fechaFin: Date;
        carrera?: string;
        soloAnomalias?: boolean;
    }
): Promise<void> {
    const csvData = datos.map(item => ({
        'Fecha Viaje': new Date(item.fechaViaje).toLocaleDateString('es-CL'),
        'Destino': item.destino,
        'Número Viaje': item.tripNumber,
        'RUT': item.rut,
        'Nombre Completo': item.nombreCompleto,
        'Email': item.email,
        'Carrera': item.carrera,
        'Estado Uso': item.estadoUso.replace('_', ' '),
        'Es Anomalía': item.esAnomalia ? 'Sí' : 'No',
        'Motivo Anomalía': item.motivoAnomalia || '',
        'Validación Ida': item.validacionIda?.validado ? 'Sí' : 'No',
        'Hora Ida': item.validacionIda?.horaValidacion ?
            new Date(item.validacionIda.horaValidacion).toLocaleTimeString('es-CL') : '',
        'Validador Ida': item.validacionIda?.validadorNombre || '',
        'Validación Vuelta': item.validacionVuelta?.validado ? 'Sí' : 'No',
        'Hora Vuelta': item.validacionVuelta?.horaValidacion ?
            new Date(item.validacionVuelta.horaValidacion).toLocaleTimeString('es-CL') : '',
        'Validador Vuelta': item.validacionVuelta?.validadorNombre || ''
    }));

    const csv = Papa.unparse(csvData, {
        header: true,
        delimiter: ';'
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `reporte_auditoria_${timestamp}.csv`;

    if (Platform.OS === 'web') {
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    } else {
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
            encoding: FileSystem.EncodingType.UTF8
        });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
        }
    }

    console.log('Reporte exportado exitosamente');
}

export async function obtenerPasesSinUso(viajeId: string): Promise<void> {
    try {
        const pasesQ = query(collection(db, 'pases'), where('viajeId', '==', viajeId));
        const pasesSnapshot = await getDocs(pasesQ);

        const pasesConQR = new Map<string, any>();

        pasesSnapshot.docs.forEach(snap => {
            const data: any = snap.data();
            if (data.qrData) {  // Solo pases que tienen QR generado
                pasesConQR.set(data.estudianteId, {
                    paseId: snap.id,
                    ...data
                });
            }
        });

        const auditoriaQ = query(collection(db, 'auditoria_viajes'), where('viajeId', '==', viajeId));
        const auditoriaSnapshot = await getDocs(auditoriaQ);

        const estudiantesConAuditoria = new Set<string>();
        auditoriaSnapshot.docs.forEach(snap => {
            const data: any = snap.data();
            estudiantesConAuditoria.add(data.estudianteId);
        });

        const batch = writeBatch(db);

        for (const [estudianteId, paseData] of pasesConQR) {
            if (!estudiantesConAuditoria.has(estudianteId)) {
                const auditoriaId = `${viajeId}_${estudianteId}`;
                const auditoriaRef = doc(collection(db, 'auditoria_viajes'), auditoriaId);

                const estudianteSnap = await getDoc(doc(db, 'users', estudianteId));

                if (estudianteSnap.exists()) {
                    const estudianteData: any = estudianteSnap.data();

                    const viajeSnap = await getDoc(doc(db, 'viajes', viajeId));

                    if (viajeSnap.exists()) {
                        const viajeData: any = viajeSnap.data();

                        const fechaViaje = viajeData.DATE_TRAVEL?.toDate ? viajeData.DATE_TRAVEL.toDate() : viajeData.DATE_TRAVEL;
                        const fechaGeneracion = paseData.fechaCreacion?.toDate ? paseData.fechaCreacion.toDate() : paseData.fechaCreacion;

                        const nuevoRegistro: AuditoriaViaje = {
                            viajeId,
                            fechaViaje,
                            destino: viajeData.DESTINATION,
                            tripNumber: viajeData.TRIP_NUMBER,

                            estudianteId,
                            nombreCompleto: `${estudianteData.nombre} ${estudianteData.apellido}`,
                            rut: estudianteData.rut,
                            email: estudianteData.email,
                            carrera: estudianteData.carrera,

                            paseId: paseData.paseId,
                            fechaGeneracion,

                            validacionIda: { validado: false },
                            validacionVuelta: { validado: false },

                            estadoUso: 'SIN_USO',
                            esAnomalia: true,
                            motivoAnomalia: 'QR generado pero no utilizado',

                            fechaConsolidacion: new Date(),
                            consolidado: true
                        };

                        batch.set(auditoriaRef, nuevoRegistro as any);
                    }
                }
            }
        }

        await batch.commit();
        console.log('Pases sin uso registrados en auditoría');

    } catch (error) {
        console.error('Error registrando pases sin uso:', error);
        throw error;
    }
}