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
import { auth, db } from '../../config/firebase';
import { UserData } from '../../contexts/AuthContext';
import { initializeApp, deleteApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    deleteUser,
    signInWithEmailAndPassword,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';


const firebaseConfig = {
    apiKey: "AIzaSyCo_eMk6NrQEqMB757fgU3FpMjLwBhfI9w",
    authDomain: "viajes-ead.firebaseapp.com",
    projectId: "viajes-ead",
    storageBucket: "viajes-ead.firebasestorage.app",
    messagingSenderId: "211543185187",
    appId: "1:211543185187:web:16c8dfa8aec492cee1de96",
    measurementId: "G-DTL2C48CB5"
};

const usersCollectionRef = collection(db, 'users');

/**
 * Obtiene todos los usuarios con el rol de 'student'.
 */
export const obtenerEstudiantes = async (): Promise<UserData[]> => {
    try {
        const q = query(usersCollectionRef, where('role', '==', 'student'));
        const querySnapshot = await getDocs(q);
        const students = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
        return students;
    } catch (error) {
        console.error("Error fetching students:", error);
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
        console.error("Error creando usuario en Auth/Firestore:", error);
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
        console.error("Error updating user:", error);
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
        console.error("Error actualizando email:", error);
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

        // Si el usuario actual es el que se está eliminando, eliminarlo de Auth
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === uid) {
            await deleteUser(currentUser);
        } else {
            console.warn("No se puede eliminar de Authentication: el usuario no es el actual o requiere permisos de admin");
            // Aquí deberías llamar a una Cloud Function si quieres eliminar otros usuarios
        }
    } catch (error) {
        console.error("Error eliminando usuario:", error);
        throw new Error("No se pudo eliminar el usuario completamente.");
    }
};

/**
 * Elimina un usuario usando credenciales de administrador (requiere Cloud Function)
 * Esta es una función de ejemplo que llamaría a tu Cloud Function
 */
export const eliminarUsuarioComoAdmin = async (uid: string): Promise<void> => {
    try {
        // Eliminar de Firestore
        const userDocRef = doc(db, 'users', uid);
        await deleteDoc(userDocRef);

        // Llamar a Cloud Function para eliminar de Auth faltaaaaa


        console.log("Usuario eliminado de Firestore. Para eliminación completa, implementa una Cloud Function.");
    } catch (error) {
        console.error("Error eliminando usuario:", error);
        throw new Error("No se pudo eliminar el usuario.");
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
        console.error("Error enviando email de recuperación:", error);
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
        console.error("Error cambiando contraseña:", error);
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
        console.error("Error desactivando usuario:", error);
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
        console.error("Error reactivando usuario:", error);
        throw new Error("No se pudo reactivar el usuario.");
    }
};