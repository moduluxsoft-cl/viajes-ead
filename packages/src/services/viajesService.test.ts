import { UserData } from '@shared/contexts/AuthContext';
import {
    doc,
    getDocs,
    runTransaction
} from 'firebase/firestore';
import {
    crearPase,
    validarPaseConteo,
    Viaje
} from './viajesService';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    getDoc: jest.fn(),
    runTransaction: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    increment: jest.fn(),
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((date) => ({ toDate: () => date }))
    },
    documentId: jest.fn()
}));

jest.mock('@shared/config/firebase', () => ({
    db: {}
}));

jest.mock('./encryption', () => ({
    encryptQRData: jest.fn(() => 'encrypted-qr-data')
}));

jest.mock('@shared/services/utilsService', () => ({
    getServerTimeFromHeader: jest.fn(() => Promise.resolve(new Date().toISOString()))
}));

describe('viajesService', () => {
    const mockTransaction = {
        get: jest.fn(),
        update: jest.fn(),
        set: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (runTransaction as jest.Mock).mockImplementation((db, callback) => callback(mockTransaction));
    });

    describe('crearPase', () => {
        const mockUser: UserData = {
            uid: 'student-123',
            nombre: 'Juan',
            apellido: 'Perez',
            rut: '12345678-9',
            carrera: 'Ingeniería',
            email: 'juan@test.com',
            rol: 'alumno'
        };

        const mockViaje: Viaje = {
            id: 'viaje-1',
            destino: 'Campus',
            fechaViaje: new Date(),
            capacidadMaxima: 40,
            pasesGenerados: 10,
            estado: 'ABIERTO'
        };

        it('should invalidate previous active passes for the same trip', async () => {
            // Mock viajeDoc exists and has capacity
            mockTransaction.get.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ GENERATED_PASSES: 10, MAX_CAPACITY: 40 })
            });

            // Mock existing passes query
            const mockOldPaseRef = { id: 'old-pase' };
            (getDocs as jest.Mock).mockResolvedValueOnce({
                forEach: (cb: any) => cb({ ref: mockOldPaseRef })
            });

            await crearPase(mockUser, mockViaje);

            // Verify update was called on old pass
            expect(mockTransaction.update).toHaveBeenCalledWith(mockOldPaseRef, { estado: 'expirado' });

            // Verify new pass creation
            expect(mockTransaction.set).toHaveBeenCalled();
        });
    });

    describe('validarPaseConteo', () => {
        const paseId = 'pase-123';
        const paseRef = {};
        const viajeRef = {};
        const estudianteRef = {};
        const auditoriaRef = {};

        const mockPaseData = {
            viajeId: 'viaje-1',
            estudianteId: 'student-123',
            scanCount: 0,
            estado: 'activo',
            fechaCreacion: { toDate: () => new Date() }
        };

        const mockViajeData = {
            STATE: 'ABIERTO',
            DATE_TRAVEL: { toDate: () => new Date() }, // Today
            DESTINATION: 'Campus',
            TRIP_NUMBER: 1
        };

        const mockEstudianteData = {
            nombre: 'Juan',
            apellido: 'Perez',
            rut: '12345678-9',
            email: 'juan@test.com',
            carrera: 'Ingeniería'
        };

        beforeEach(() => {
            (doc as jest.Mock).mockReturnValue({});
        });

        it('should fail if trip is not OPEN', async () => {
            mockTransaction.get
                .mockResolvedValueOnce({ exists: () => true, data: () => mockPaseData, id: paseId }) // Pase
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ ...mockViajeData, STATE: 'CERRADO' }) }); // Viaje

            const result = await validarPaseConteo(paseId);

            expect(result.success).toBe(false);
            expect(result.error).toContain('El viaje no está abierto');
        });

        it('should fail if trip date is not today', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            mockTransaction.get
                .mockResolvedValueOnce({ exists: () => true, data: () => mockPaseData, id: paseId }) // Pase
                .mockResolvedValueOnce({ exists: () => true, data: () => ({ ...mockViajeData, DATE_TRAVEL: { toDate: () => yesterday } }) }); // Viaje

            const result = await validarPaseConteo(paseId);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Este pase no corresponde a la fecha del viaje de hoy');
        });

        it('should successfully validate IDA and update audit atomically', async () => {
            mockTransaction.get
                .mockResolvedValueOnce({ exists: () => true, data: () => mockPaseData, id: paseId }) // Pase
                .mockResolvedValueOnce({ exists: () => true, data: () => mockViajeData }) // Viaje
                .mockResolvedValueOnce({ exists: () => true, data: () => mockEstudianteData }) // Estudiante
                .mockResolvedValueOnce({ exists: () => false }); // Auditoria (New)

            const result = await validarPaseConteo(paseId);

            expect(result.success).toBe(true);
            expect(result.message).toContain('IDA');

            // Verify Pase Update
            expect(mockTransaction.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ estado: 'usado' }));

            // Verify Audit Creation (Set)
            expect(mockTransaction.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                estadoUso: 'SOLO_IDA',
                esAnomalia: true,
                validacionIda: expect.objectContaining({ validado: true })
            }));
        });

        it('should successfully validate VUELTA and update audit atomically', async () => {
            const mockPaseVuelta = { ...mockPaseData, scanCount: 1, estado: 'usado' };

            mockTransaction.get
                .mockResolvedValueOnce({ exists: () => true, data: () => mockPaseVuelta, id: paseId }) // Pase
                .mockResolvedValueOnce({ exists: () => true, data: () => mockViajeData }) // Viaje
                .mockResolvedValueOnce({ exists: () => true, data: () => mockEstudianteData }) // Estudiante
                .mockResolvedValueOnce({
                    exists: () => true, data: () => ({ // Auditoria (Existing)
                        validacionIda: { validado: true },
                        estadoUso: 'SOLO_IDA'
                    })
                });

            const result = await validarPaseConteo(paseId);

            expect(result.success).toBe(true);
            expect(result.message).toContain('VUELTA');

            // Verify Audit Update
            expect(mockTransaction.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                estadoUso: 'OK',
                esAnomalia: false,
                validacionVuelta: expect.objectContaining({ validado: true })
            }));
        });
    });
});
