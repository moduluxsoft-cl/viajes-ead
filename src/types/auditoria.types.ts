// src/types/auditoria.types.ts
export interface AuditoriaViaje {
    id?: string;
    // Datos del viaje
    viajeId: string;
    fechaViaje: Date;
    destino: string;
    tripNumber: number;

    // Datos del estudiante
    estudianteId: string;
    nombreCompleto: string;
    rut: string;
    email: string;
    carrera: string;

    // Datos del pase
    paseId: string;
    fechaGeneracion: Date;

    // Validaciones
    validacionIda: {
        validado: boolean;
        horaValidacion?: Date;
        validadorId?: string;
        validadorNombre?: string;
    };
    validacionVuelta: {
        validado: boolean;
        horaValidacion?: Date;
        validadorId?: string;
        validadorNombre?: string;
    };

    // Estado de auditoría
    estadoUso: 'OK' | 'SOLO_IDA' | 'SOLO_VUELTA' | 'SIN_USO';
    esAnomalia: boolean;
    motivoAnomalia?: string;

    // Metadatos
    fechaConsolidacion?: Date;
    consolidado: boolean;
}