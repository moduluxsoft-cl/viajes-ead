// src/services/usersService.ts
import {
    collection,
    doc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    setDoc,
    Timestamp
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '@/config/firebase';
import { UserData } from '@/contexts/AuthContext';
import { initializeApp, deleteApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    deleteUser,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';
import Papa from 'papaparse';
import { getFunctions, httpsCallable } from "@firebase/functions";
import AsyncStorage from '@react-native-async-storage/async-storage';

const usersCollectionRef = collection(db, 'users');

const CSV_UPLOAD_LIMIT = 100;
const CSV_UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const LAST_UPLOAD_KEY = 'lastCsvUploadTimestamp';
const UPLOAD_COUNT_KEY = 'csvUploadCount';

/**
 * Obtiene todos los usuarios con el rol de 'student'.
 */
export const obtenerUsuariosGestionables = async (): Promise<UserData[]> => {
    try {
        const q = query(usersCollectionRef, where('role', 'in', ['student', 'validator']));
        const querySnapshot = await getDocs(q);
        const students = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
        return students;
    } catch (error) {
        throw new Error("No se pudo obtener la lista de estudiantes.");
    }
};

/**
 * Crea un nuevo usuario en Firebase Auth y su documento correspondiente en Firestore.
 * @param userData - Datos del usuario a crear. Debe incluir email.
 * @param password - Contraseña temporal para el nuevo usuario.
 */
export const crearUsuario = async (userData: Omit<UserData, 'uid' | 'activo' | 'fechaCreacion'>, password: string): Promise<string> => {
    if (!userData.email || !password) {
        throw new Error("El email y la contraseña son requeridos para crear un usuario.");
    }

    const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuth');

    try {
        const secondaryAuth = getAuth(secondaryApp);
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
        const newUid = userCredential.user.uid;

        const userDocumentData = {
            ...userData,
            activo: true,
            fechaCreacion: Timestamp.now(),
            role: userData.role || 'student'
        };

        await setDoc(doc(db, 'users', newUid), userDocumentData);

        return newUid;

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('Este correo electrónico ya está en uso por otro usuario.');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('La contraseña es demasiado débil. Debe tener al menos 6 caracteres.');
        }
        throw new Error("No se pudo crear el usuario. Revisa la consola para más detalles.");
    } finally {
        await deleteApp(secondaryApp);
    }
};

/**
 * Actualiza los datos de un usuario específico en Firestore.
 * @param uid - El ID del usuario a actualizar.
 * @param data - Los campos a actualizar.
 */
export const actualizarUsuario = async (uid: string, data: Partial<UserData>): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, data);
    } catch (error) {
        throw new Error("No se pudo actualizar el usuario.");
    }
};

/**
 * Actualiza el email del usuario tanto en Auth como en Firestore
 * Requiere que el usuario esté autenticado y proporcione su contraseña actual
 */
export const actualizarEmailUsuario = async (
    uid: string,
    nuevoEmail: string,
    passwordActual: string
): Promise<void> => {
    try {
        const user = auth.currentUser;
        if (!user || user.uid !== uid) {
            throw new Error("El usuario no está autenticado o no tiene permisos para esta operación.");
        }

        const credential = EmailAuthProvider.credential(user.email!, passwordActual);
        await reauthenticateWithCredential(user, credential);

        await updateEmail(user, nuevoEmail);

        await actualizarUsuario(uid, { email: nuevoEmail });

    } catch (error: any) {
        if (error.code === 'auth/wrong-password') {
            throw new Error('La contraseña actual es incorrecta.');
        } else if (error.code === 'auth/email-already-in-use') {
            throw new Error('Este correo electrónico ya está en uso.');
        }
        throw new Error("No se pudo actualizar el email.");
    }
};

/**
 * Elimina un usuario tanto de Firestore como de Firebase Authentication
 * NOTA: Para eliminar otros usuarios que no sean el actual, se necesita una Cloud Function
 * Esta función solo puede eliminar al usuario actualmente autenticado
 */
export const eliminarUsuarioCompleto = async (uid: string): Promise<void> => {
    try {
        // Primero eliminar de Firestore
        const userDocRef = doc(db, 'users', uid);
        await deleteDoc(userDocRef);

        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === uid) {
            await deleteUser(currentUser);
        } else {
        }
    } catch (error) {
        throw new Error("No se pudo eliminar el usuario completamente.");
    }
};

/**
 * Elimina un usuario usando credenciales de administrador (requiere Cloud Function)
 * Esta es una función de ejemplo que llamaría a tu Cloud Function
 */
export const eliminarUsuarioComoAdmin = async (uid: string): Promise<void> => {
    try {
        const functions = getFunctions();
        const deleteUserFunction = httpsCallable(functions, 'deleteUser');

        await deleteUserFunction({ uid: uid });

    } catch (error: any) {
        throw new Error(error.message || "No se pudo eliminar el usuario.");
    }
};

/**
 * Envía un email de recuperación de contraseña
 * @param email - Email del usuario que quiere recuperar su contraseña
 */
export const enviarEmailRecuperacion = async (email: string): Promise<void> => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            throw new Error('No existe una cuenta con este correo electrónico.');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('El correo electrónico no es válido.');
        }
        throw new Error("No se pudo enviar el email de recuperación.");
    }
};

/**
 * Cambia la contraseña del usuario actual
 * Requiere que el usuario proporcione su contraseña actual
 */
export const cambiarPassword = async (
    passwordActual: string,
    passwordNueva: string
): Promise<void> => {
    try {
        const user = auth.currentUser;
        if (!user || !user.email) {
            throw new Error("No hay un usuario autenticado.");
        }

        // Re-autenticar al usuario
        const credential = EmailAuthProvider.credential(user.email, passwordActual);
        await reauthenticateWithCredential(user, credential);

        // Cambiar la contraseña
        await updatePassword(user, passwordNueva);

    } catch (error: any) {
        if (error.code === 'auth/wrong-password') {
            throw new Error('La contraseña actual es incorrecta.');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('La nueva contraseña es demasiado débil.');
        }
        throw new Error("No se pudo cambiar la contraseña.");
    }
};

/**
 * Desactiva un usuario (soft delete) - solo marca como inactivo en Firestore
 * Útil cuando no quieres eliminar completamente al usuario
 */
export const desactivarUsuario = async (uid: string): Promise<void> => {
    try {
        await actualizarUsuario(uid, {
            activo: false,
        });
    } catch (error) {
        throw new Error("No se pudo desactivar el usuario.");
    }
};

/**
 * Reactiva un usuario previamente desactivado
 */
export const reactivarUsuario = async (uid: string): Promise<void> => {
    try {
        await actualizarUsuario(uid, {
            activo: true,
        });
    } catch (error) {
        throw new Error("No se pudo reactivar el usuario.");
    }
};

export interface CSVRow {
    nombre: string;
    apellido: string;
    rut: string;
    email: string;
    carrera: string;
}

export interface BatchResult {
    successCount: number;
    errorCount: number;
    errors: { row: number; message: string; data: CSVRow }[];
}

export interface DeleteBatchResult {
    successCount: number;
    errorCount: number;
    errors: { row: number; message: string; email: string }[];
}

/**
 * Procesa un archivo CSV para crear usuarios en lote.
 * @param csvString - El contenido del archivo CSV como un string.
 * @returns Un objeto con el resultado del proceso.
 */
export const crearUsuariosDesdeCSV = async (csvString: string): Promise<BatchResult> => {
    const result: BatchResult = {
        successCount: 0,
        errorCount: 0,
        errors: [],
    };

    // 1. Parsear el CSV
    const parseResult = Papa.parse<CSVRow>(csvString, {
        header: true,
        skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
        throw new Error("El archivo CSV tiene un formato incorrecto y no pudo ser leído.");
    }

    const rows = parseResult.data;

    // Validar si la cantidad de usuarios excede el límite
    if (rows.length > CSV_UPLOAD_LIMIT) {
        throw new Error(`Solo puedes cargar un máximo de ${CSV_UPLOAD_LIMIT} usuarios a la vez.`);
    }

    // Obtener información de la última carga
    const lastUploadTimestampStr = await AsyncStorage.getItem(LAST_UPLOAD_KEY);
    const uploadCountStr = await AsyncStorage.getItem(UPLOAD_COUNT_KEY);


    const lastUploadTimestamp = lastUploadTimestampStr ? parseInt(lastUploadTimestampStr, 10) : 0;
    let uploadCount = uploadCountStr ? parseInt(uploadCountStr, 10) : 0;
    const now = Date.now();

    // Resetear el contador si ha pasado el tiempo de la ventana
    if (now - lastUploadTimestamp > CSV_UPLOAD_WINDOW_MS) {
        uploadCount = 0;
        await AsyncStorage.setItem(UPLOAD_COUNT_KEY, '0');
        await AsyncStorage.removeItem(LAST_UPLOAD_KEY);
    }

    // Verificar si la carga actual excederá el límite
    if (uploadCount + rows.length > CSV_UPLOAD_LIMIT) {
        const timeLeft = Math.ceil((CSV_UPLOAD_WINDOW_MS - (now - lastUploadTimestamp)) / (60 * 1000));
        throw new Error(
            `Has alcanzado el límite de ${CSV_UPLOAD_LIMIT} usuarios por hora. ` +
            `Por favor, intenta de nuevo en aproximadamente ${timeLeft} minutos.`
        );
    }

    const secondaryApp = initializeApp(auth.app.options, 'SecondaryAuthForBatch');
    const secondaryAuth = getAuth(secondaryApp);

    const usersCollectionRef = collection(db, 'users');
    const existingUsersSnapshot = await getDocs(usersCollectionRef);
    const existingEmails = new Set(existingUsersSnapshot.docs.map(doc => doc.data().email));

    // 3. Procesar cada fila
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIndex = i + 2;

        // Validación básica de formato de email
        if (!row.email || !/\S+@\S+\.\S+/.test(row.email)) {
            result.errorCount++;
            result.errors.push({ row: rowIndex, message: 'Formato de email inválido.', data: row });
            continue;
        }

        // Validación de duplicados (en la BD y en el propio archivo)
        if (existingEmails.has(row.email)) {
            result.errorCount++;
            result.errors.push({ row: rowIndex, message: 'El email ya existe en el sistema.', data: row });
            continue;
        }

        // Generar contraseña temporal segura
        const tempPassword = Math.random().toString(36).slice(-8) + "aA1!";

        try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, row.email, tempPassword);
            const newUid = userCredential.user.uid;

            const userDocumentData: Omit<UserData, 'uid'> = {
                nombre: row.nombre || '',
                apellido: row.apellido || '',
                rut: row.rut || '',
                email: row.email,
                carrera: row.carrera || 'No especificada',
                role: 'student',
                activo: true,
                fechaCreacion: Timestamp.now(),
            };

            await setDoc(doc(db, 'users', newUid), userDocumentData);

            result.successCount++;
            existingEmails.add(row.email);

        } catch (error: any) {
            result.errorCount++;
            let message = "Error desconocido al crear el usuario.";
            if (error.code === 'auth/email-already-in-use') {
                message = 'El email ya está en uso (conflicto durante la carga).';
            } else if (error.code === 'auth/weak-password') {
                message = 'La contraseña generada es débil (error interno).';
            }
            result.errors.push({ row: rowIndex, message, data: row });
        }
    }

    // Actualizar el contador y el timestamp después de una carga exitosa
    if (result.successCount > 0) {
        const newUploadCount = uploadCount + result.successCount;
        await AsyncStorage.setItem(LAST_UPLOAD_KEY, now.toString());
        await AsyncStorage.setItem(UPLOAD_COUNT_KEY, newUploadCount.toString());
    }

    await deleteApp(secondaryApp);
    return result;
};


/**
 * Procesa un archivo CSV para eliminar usuarios en lote.
 * El CSV debe contener una columna 'email'.
 * @param csvString - El contenido del archivo CSV como un string.
 * @returns Un objeto con el resultado del proceso de eliminación.
 */
export const eliminarUsuariosDesdeCSV = async (csvString: string): Promise<DeleteBatchResult> => {
    const result: DeleteBatchResult = {
        successCount: 0,
        errorCount: 0,
        errors: [],
    };

    // 1. Parsear el CSV
    const parseResult = Papa.parse<{ email: string }>(csvString, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',',
    });


    if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(err => console.error("Papaparse Error:", err));
        throw new Error("El archivo CSV tiene un formato incorrecto o faltan encabezados.");
    }

    const rows = parseResult.data;
    const functions = getFunctions();
    const deleteUserFunction = httpsCallable(functions, 'deleteUser'); // Asumiendo que tienes una Cloud Function para esto

    // 2. Procesar cada fila
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIndex = i + 2; // +1 por el índice base 0, +1 por la cabecera

        // Validación básica de formato de email
        if (!row.email || !/\S+@\S+\.\S+/.test(row.email)) {
            result.errorCount++;
            result.errors.push({ row: rowIndex, message: 'Formato de email inválido.', email: row.email || '' });
            continue;
        }

        try {

            // Buscar el usuario en Firestore para obtener el UID
            const q = query(usersCollectionRef, where('email', '==', row.email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                result.errorCount++;
                result.errors.push({ row: rowIndex, message: 'Usuario no encontrado en Firestore.', email: row.email });
                continue;
            }

            const userDoc = querySnapshot.docs[0];
            const uidToDelete = userDoc.id;

            // Llamar a la Cloud Function para eliminar el usuario de Auth y Firestore
            await deleteUserFunction({ uid: uidToDelete });

            result.successCount++;

        } catch (error: any) {
            result.errorCount++;
            let message = "Error desconocido al eliminar el usuario.";
            if (error.code === 'functions/not-found') {
                message = 'La función de eliminación no está configurada correctamente.';
            } else if (error.code === 'functions/permission-denied') {
                message = 'Permiso denegado para eliminar este usuario.';
            } else if (error.message.includes('auth/user-not-found')) { // Mensaje de error de la Cloud Function
                message = 'Usuario no encontrado en Firebase Authentication.';
            }
            result.errors.push({ row: rowIndex, message, email: row.email });
        }
    }
    return result;
};

/**
 * Obtiene el estado actual del límite de carga de CSV.
 * @returns Un objeto con el recuento actual y el tiempo restante en minutos.
 */
export const getCsvUploadLimitStatus = async (): Promise<{ count: number; timeLeftMinutes: number }> => {
    const lastUploadTimestampStr = await AsyncStorage.getItem(LAST_UPLOAD_KEY);
    const uploadCountStr = await AsyncStorage.getItem(UPLOAD_COUNT_KEY);

    const lastUploadTimestamp = lastUploadTimestampStr ? parseInt(lastUploadTimestampStr, 10) : 0;
    let uploadCount = uploadCountStr ? parseInt(uploadCountStr, 10) : 0;
    const now = Date.now();

    let timeLeftMinutes = 0;


    // Si ha pasado más de una hora desde la última carga, resetear el contador
    if (now - lastUploadTimestamp > CSV_UPLOAD_WINDOW_MS) {
        uploadCount = 0;
        await AsyncStorage.setItem(UPLOAD_COUNT_KEY, '0'); // Ensure it's reset in storage
        await AsyncStorage.removeItem(LAST_UPLOAD_KEY); // Also remove the timestamp to be clean
    } else {
        // Calcular el tiempo restante si estamos dentro de la ventana
        timeLeftMinutes = Math.ceil((CSV_UPLOAD_WINDOW_MS - (now - lastUploadTimestamp)) / (60 * 1000));
    }

    return { count: uploadCount, timeLeftMinutes };
};
