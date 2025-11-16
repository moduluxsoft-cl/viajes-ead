/**
 * Script para inicializar datos en Firestore Emulator
 *
 * USO:
 *   1. Inicia los emulators: npm run qa:serve:all
 *   2. En otra terminal: node firebase/scripts/init-firestore-data.js
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

    // 3. COLECCIÓN: users (ejemplo)
    console.log('👥 Creando usuarios de ejemplo...');

    const users = [
      {
        uid: 'test-student-1',
        activo: true,
        apellido: 'CARTES CARO',
        carrera: 'Arquitectura',
        email: 'valentina.cartes.c@mail.pucv.cl',
        fechaCreacion: admin.firestore.Timestamp.now(),
        nombre: 'VALENTINA IGNACIA',
        role: 'student',
        rut: '22.262.462-2'
      },
      {
        uid: 'test-student-2',
        activo: true,
        apellido: 'SEGOVIA VEGA',
        carrera: 'Ingeniería Informática',
        email: 'daniel.segoviavega@gmail.com',
        fechaCreacion: admin.firestore.Timestamp.now(),
        nombre: 'DANIEL',
        role: 'student',
        rut: '18.758.759-K'
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
        DATE_TRAVEL: admin.firestore.Timestamp.fromDate(new Date('2025-11-05T12:00:00Z')),
        DESTINATION: 'Ciudad Abierta, Ritoque',
        GENERATED_PASSES: 0,
        MAX_CAPACITY: 208,
        STATE: 'CERRADO',
        TRIP_NUMBER: 22
      },
      {
        id: 'viajes-23',
        DATE_TRAVEL: admin.firestore.Timestamp.fromDate(new Date('2025-11-12T12:00:00Z')),
        DESTINATION: 'Ciudad Abierta, Ritoque',
        GENERATED_PASSES: 5,
        MAX_CAPACITY: 208,
        STATE: 'CERRADO',
        TRIP_NUMBER: 23
      },
      {
        id: 'viajes-24',
        DATE_TRAVEL: admin.firestore.Timestamp.fromDate(new Date('2025-11-19T12:00:00Z')),
        DESTINATION: 'Ciudad Abierta, Ritoque',
        GENERATED_PASSES: 15,
        MAX_CAPACITY: 208,
        STATE: 'CERRADO',
        TRIP_NUMBER: 24
      },
      {
        id: 'viajes-25',
        DATE_TRAVEL: admin.firestore.Timestamp.fromDate(new Date('2025-11-26T12:00:00Z')),
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

    // 5. COLECCIÓN: auditoria_viajes (ejemplo)
    console.log('📝 Creando auditoría de ejemplo...');

    const auditoria = {
      carrera: 'Ingeniería Informática',
      consolidado: false,
      destino: 'Campus',
      email: 'daniel.segoviavega@gmail.com',
      esAnomalia: false,
      estadoUso: 'SIN_USO',
      estudianteId: 'test-student-2',
      fechaGeneracion: admin.firestore.Timestamp.now(),
      fechaViaje: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T16:20:44Z')),
      nombreCompleto: 'daniel segovia',
      paseId: 'pase-111-222',
      rut: '18.758.759-k',
      tripNumber: 101,
      validacionIda: {
        horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T16:24:55Z')),
        validado: false
      },
      validacionVuelta: {
        horaValidacion: admin.firestore.Timestamp.fromDate(new Date('2025-11-09T16:24:51Z')),
        validado: false
      },
      viajeId: 'viaje-abc-123'
    };

    await db.collection('auditoria_viajes').add(auditoria);
    console.log(`  ✓ Auditoría creada para ${auditoria.nombreCompleto}`);
    console.log('✅ Auditoría creada\n');

    console.log('🎉 ¡Datos inicializados correctamente!');
    console.log('\n📊 Resumen:');
    console.log('  - 1 counter');
    console.log('  - 6 properties');
    console.log('  - 4 usuarios (1 student, 1 admin, 1 validator, 1 student extra)');
    console.log('  - 4 viajes (3 cerrados, 1 abierto)');
    console.log('  - 1 auditoría de ejemplo');
    console.log('\n🌐 Accede a Firestore Emulator UI: http://localhost:4000/firestore');

  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar
initializeData();
