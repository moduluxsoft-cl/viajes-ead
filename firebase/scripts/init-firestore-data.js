/**
 * Script para inicializar datos en Firestore Emulator
 *
 * USO:
 *   1. Inicia los emulators: npm run dev:emulators
 *   2. En otra terminal: npm run dev:init-data
 */

const admin = require('firebase-admin');

// Conectar al emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// Inicializar Firebase Admin
admin.initializeApp({
  projectId: 'viajes-ead'
});

const db = admin.firestore();

async function initializeData() {
  console.log('🚀 Inicializando datos en Firestore Emulator...\n');

  try {
    // 1. COLECCIÓN: counters
    console.log('📊 Creando colección "counters"...');
    await db.collection('counters').doc('viajes_counter').set({
      currentNumber: 25
    });
    console.log('✅ Counter creado: viajes_counter (currentNumber: 25)\n');

    // 2. COLECCIÓN: properties
    console.log('⚙️  Creando colección "properties"...');

    const properties = [
      { name: 'CARRERA', value: 'Arquitectura' },
      { name: 'CARRERA', value: 'Diseño' },
      { name: 'CARRERA', value: 'Diseño Industrial' },
      { name: 'CARRERA', value: 'Programa de Movilidad Estudiantil (PME)' },
      { name: 'MAX_TICKET_USES', value: 2 },
      { name: 'MAX_CAPACITY', value: 250 }
    ];

    for (const prop of properties) {
      await db.collection('properties').add(prop);
      console.log(`  ✓ ${prop.name}: ${prop.value}`);
    }
    console.log('✅ Properties creadas\n');

    // 3. COLECCIÓN: users
    console.log('👥 Creando usuarios de ejemplo...');

    const users = [
      {
        uid: 'dsego',
        activo: true,
        apellido: 'SEGOVIA VEGA',
        carrera: 'Ingeniería Informática',
        email: 'daniel.segoviavega@gmail.com',
        fechaCreacion: admin.firestore.Timestamp.fromDate(new Date('2025-08-10T20:47:02Z')),
        nombre: 'DANIEL',
        role: 'student',
        rut: '18.758.759-k'
      },
      {
        uid: 'vcartes',
        activo: true,
        apellido: 'CARTES CARO',
        carrera: 'Arquitectura',
        email: 'valentina.cartes.c@mail.pucv.cl',
        fechaCreacion: admin.firestore.Timestamp.fromDate(new Date('2025-08-10T20:47:02Z')),
        nombre: 'VALENTINA IGNACIA',
        role: 'student',
        rut: '22.262.462-2'
      },
      {
        uid: 'jperez',
        activo: true,
        apellido: 'PÉREZ GONZÁLEZ',
        carrera: 'Diseño',
        email: 'juan.perez@mail.pucv.cl',
        fechaCreacion: admin.firestore.Timestamp.now(),
        nombre: 'JUAN CARLOS',
        role: 'student',
        rut: '19.876.543-2'
      },
      {
        uid: 'mlopez',
        activo: true,
        apellido: 'LÓPEZ MORALES',
        carrera: 'Diseño Industrial',
        email: 'maria.lopez@mail.pucv.cl',
        fechaCreacion: admin.firestore.Timestamp.now(),
        nombre: 'MARÍA JOSÉ',
        role: 'student',
        rut: '20.123.456-7'
      },
      {
        uid: 'test-admin-1',
        activo: true,
        apellido: 'ADMIN',
        carrera: 'N/A',
        email: 'admin@viajes-ead.cl',
        fechaCreacion: admin.firestore.Timestamp.now(),
        nombre: 'ADMINISTRADOR',
        role: 'admin',
        rut: '11.111.111-1'
      },
      {
        uid: 'test-validator-1',
        activo: true,
        apellido: 'VALIDADOR',
        carrera: 'N/A',
        email: 'validator@viajes-ead.cl',
        fechaCreacion: admin.firestore.Timestamp.now(),
        nombre: 'VALIDADOR',
        role: 'validator',
        rut: '22.222.222-2'
      }
    ];

    for (const user of users) {
      const { uid, ...userData } = user;
      await db.collection('users').doc(uid).set(userData);
      console.log(`  ✓ ${userData.nombre} ${userData.apellido} (${userData.role})`);
    }
    console.log('✅ Usuarios creados\n');

    // 4. COLECCIÓN: viajes
    console.log('🚌 Creando viajes de ejemplo...');

    const viajes = [
      {
        id: 'viajes-22',
        DATE_TRAVEL: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T09:00:00-03:00')),
        DESTINATION: 'Ciudad Abierta, Ritoque',
        GENERATED_PASSES: 8,
        MAX_CAPACITY: 208,
        STATE: 'CERRADO',
        TRIP_NUMBER: 22
      },
      {
        id: 'viajes-23',
        DATE_TRAVEL: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T09:00:00-03:00')),
        DESTINATION: 'Ciudad Abierta, Ritoque',
        GENERATED_PASSES: 5,
        MAX_CAPACITY: 208,
        STATE: 'CERRADO',
        TRIP_NUMBER: 23
      },
      {
        id: 'viajes-24',
        DATE_TRAVEL: admin.firestore.Timestamp.fromDate(new Date('2025-11-19T09:00:00-03:00')),
        DESTINATION: 'Ciudad Abierta, Ritoque',
        GENERATED_PASSES: 15,
        MAX_CAPACITY: 208,
        STATE: 'CERRADO',
        TRIP_NUMBER: 24
      },
      {
        id: 'viajes-25',
        DATE_TRAVEL: admin.firestore.Timestamp.fromDate(new Date('2025-11-26T09:00:00-03:00')),
        DESTINATION: 'Ciudad Abierta, Ritoque',
        GENERATED_PASSES: 0,
        MAX_CAPACITY: 250,
        STATE: 'ABIERTO',
        TRIP_NUMBER: 25
      }
    ];

    for (const viaje of viajes) {
      const { id, ...viajeData } = viaje;
      await db.collection('viajes').doc(id).set(viajeData);
      console.log(`  ✓ ${id}: ${viajeData.DESTINATION} (${viajeData.STATE})`);
    }
    console.log('✅ Viajes creados\n');

    // 5. COLECCIÓN: auditoria_viajes
    console.log('📝 Creando registros de auditoría...');

    const auditorias = [
      // Auditoría 1: Pase sin uso
      {
        carrera: 'Ingeniería Informática',
        consolidado: false,
        destino: 'Ciudad Abierta, Ritoque',
        email: 'daniel.segoviavega@gmail.com',
        esAnomalia: false,
        estadoUso: 'SIN_USO',
        estudianteId: 'dsego',
        fechaGeneracion: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T13:22:48-03:00')),
        fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T13:20:44-03:00')),
        nombreCompleto: 'DANIEL SEGOVIA VEGA',
        paseId: 'pase-111-222',
        rut: '18.758.759-k',
        tripNumber: 22,
        validacionIda: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T16:24:55-03:00')),
          validado: false
        },
        validacionVuelta: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T16:24:51-03:00')),
          validado: false
        },
        viajeId: 'viajes-22'
      },

      // Auditoría 2: Pase completamente validado (ida y vuelta)
      {
        carrera: 'Arquitectura',
        consolidado: true,
        destino: 'Ciudad Abierta, Ritoque',
        email: 'valentina.cartes.c@mail.pucv.cl',
        esAnomalia: false,
        estadoUso: 'USADO',
        estudianteId: 'vcartes',
        fechaGeneracion: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T10:15:30-03:00')),
        fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T09:00:00-03:00')),
        nombreCompleto: 'VALENTINA IGNACIA CARTES CARO',
        paseId: 'pase-222-333',
        rut: '22.262.462-2',
        tripNumber: 22,
        validacionIda: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T09:30:00-03:00')),
          validado: true
        },
        validacionVuelta: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T18:15:00-03:00')),
          validado: true
        },
        viajeId: 'viajes-22'
      },

      // Auditoría 3: Solo validado ida
      {
        carrera: 'Diseño',
        consolidado: false,
        destino: 'Ciudad Abierta, Ritoque',
        email: 'juan.perez@mail.pucv.cl',
        esAnomalia: false,
        estadoUso: 'PARCIAL',
        estudianteId: 'jperez',
        fechaGeneracion: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T08:30:00-03:00')),
        fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T09:00:00-03:00')),
        nombreCompleto: 'JUAN CARLOS PÉREZ GONZÁLEZ',
        paseId: 'pase-333-444',
        rut: '19.876.543-2',
        tripNumber: 23,
        validacionIda: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T09:20:00-03:00')),
          validado: true
        },
        validacionVuelta: {
          horaValidacion: null,
          validado: false
        },
        viajeId: 'viajes-23'
      },

      // Auditoría 4: Pase con anomalía (validado pero marcado como anomalía)
      {
        carrera: 'Diseño Industrial',
        consolidado: true,
        destino: 'Ciudad Abierta, Ritoque',
        email: 'maria.lopez@mail.pucv.cl',
        esAnomalia: true,
        estadoUso: 'USADO',
        estudianteId: 'mlopez',
        fechaGeneracion: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T07:45:00-03:00')),
        fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T09:00:00-03:00')),
        nombreCompleto: 'MARÍA JOSÉ LÓPEZ MORALES',
        paseId: 'pase-444-555',
        rut: '20.123.456-7',
        tripNumber: 23,
        validacionIda: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T09:45:00-03:00')),
          validado: true
        },
        validacionVuelta: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T19:30:00-03:00')),
          validado: true
        },
        viajeId: 'viajes-23'
      },

      // Auditoría 5: Pase generado pero no usado (viaje futuro)
      {
        carrera: 'Ingeniería Informática',
        consolidado: false,
        destino: 'Ciudad Abierta, Ritoque',
        email: 'daniel.segoviavega@gmail.com',
        esAnomalia: false,
        estadoUso: 'SIN_USO',
        estudianteId: 'dsego',
        fechaGeneracion: admin.firestore.Timestamp.now(),
        fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-19T09:00:00-03:00')),
        nombreCompleto: 'DANIEL SEGOVIA VEGA',
        paseId: 'pase-555-666',
        rut: '18.758.759-k',
        tripNumber: 24,
        validacionIda: {
          horaValidacion: null,
          validado: false
        },
        validacionVuelta: {
          horaValidacion: null,
          validado: false
        },
        viajeId: 'viajes-24'
      },

      // Auditoría 6: Múltiples pases del mismo estudiante (viaje 24)
      {
        carrera: 'Arquitectura',
        consolidado: false,
        destino: 'Ciudad Abierta, Ritoque',
        email: 'valentina.cartes.c@mail.pucv.cl',
        esAnomalia: false,
        estadoUso: 'SIN_USO',
        estudianteId: 'vcartes',
        fechaGeneracion: admin.firestore.Timestamp.fromDate(new Date('2025-11-18T14:30:00-03:00')),
        fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-19T09:00:00-03:00')),
        nombreCompleto: 'VALENTINA IGNACIA CARTES CARO',
        paseId: 'pase-666-777',
        rut: '22.262.462-2',
        tripNumber: 24,
        validacionIda: {
          horaValidacion: null,
          validado: false
        },
        validacionVuelta: {
          horaValidacion: null,
          validado: false
        },
        viajeId: 'viajes-24'
      },

      // Auditoría 7: Solo validado vuelta (caso anómalo)
      {
        carrera: 'Diseño',
        consolidado: false,
        destino: 'Ciudad Abierta, Ritoque',
        email: 'juan.perez@mail.pucv.cl',
        esAnomalia: true,
        estadoUso: 'PARCIAL',
        estudianteId: 'jperez',
        fechaGeneracion: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T08:00:00-03:00')),
        fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T09:00:00-03:00')),
        nombreCompleto: 'JUAN CARLOS PÉREZ GONZÁLEZ',
        paseId: 'pase-777-888',
        rut: '19.876.543-2',
        tripNumber: 22,
        validacionIda: {
          horaValidacion: null,
          validado: false
        },
        validacionVuelta: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T18:00:00-03:00')),
          validado: true
        },
        viajeId: 'viajes-22'
      },

      // Auditoría 8: Pase consolidado sin anomalías (completo)
      {
        carrera: 'Diseño Industrial',
        consolidado: true,
        destino: 'Ciudad Abierta, Ritoque',
        email: 'maria.lopez@mail.pucv.cl',
        esAnomalia: false,
        estadoUso: 'USADO',
        estudianteId: 'mlopez',
        fechaGeneracion: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T07:30:00-03:00')),
        fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T09:00:00-03:00')),
        nombreCompleto: 'MARÍA JOSÉ LÓPEZ MORALES',
        paseId: 'pase-888-999',
        rut: '20.123.456-7',
        tripNumber: 22,
        validacionIda: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T09:15:00-03:00')),
          validado: true
        },
        validacionVuelta: {
          horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T17:45:00-03:00')),
          validado: true
        },
        viajeId: 'viajes-22'
      }
    ];

    for (const [index, auditoria] of auditorias.entries()) {
      await db.collection('auditoria_viajes').add(auditoria);
      console.log(`  ✓ Auditoría ${index + 1}: ${auditoria.nombreCompleto} - ${auditoria.estadoUso}`);
    }
    console.log('✅ Auditorías creadas\n');

    console.log('🎉 ¡Datos inicializados correctamente!');
    console.log('\n📊 Resumen:');
    console.log('  - 1 counter (currentNumber: 25)');
    console.log('  - 6 properties (4 carreras + 2 configuraciones)');
    console.log('  - 6 usuarios (4 estudiantes, 1 admin, 1 validator)');
    console.log('  - 4 viajes (3 cerrados, 1 abierto)');
    console.log(`  - ${auditorias.length} registros de auditoría`);
    console.log('    ├─ Sin uso: 3');
    console.log('    ├─ Usados: 3');
    console.log('    ├─ Parciales: 2');
    console.log('    ├─ Con anomalías: 2');
    console.log('    └─ Consolidados: 3');
    console.log('\n🌐 Accede a Firestore Emulator UI: http://localhost:4000/firestore');
    console.log('👤 Usuarios disponibles para login (configura contraseñas en Auth UI):');
    console.log('   - daniel.segoviavega@gmail.com (student)');
    console.log('   - valentina.cartes.c@mail.pucv.cl (student)');
    console.log('   - juan.perez@mail.pucv.cl (student)');
    console.log('   - maria.lopez@mail.pucv.cl (student)');
    console.log('   - admin@viajes-ead.cl (admin)');
    console.log('   - validator@viajes-ead.cl (validator)');

  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar
initializeData();
