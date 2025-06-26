// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import {
    onAuthStateChanged,
    User,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword, UserCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '.././config/firebase'; //
import { useRouter, useSegments } from 'expo-router';

export interface UserData {
    uid: string;
    email: string;
    role: 'student' | 'validator' | 'admin';
    nombre: string;
    apellido: string;
    rut?: string;
    carrera?: string;
    activo: boolean;
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<UserCredential>;
    register: (email: string, password: string, userData: Partial<UserData>) => Promise<UserCredential>;
    logout: () => Promise<void>;
    updateUserData: (data: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);

            if (currentUser) {
                setUser(currentUser);
                await fetchUserData(currentUser.uid);
            } else {
                setUser(null);
                setUserData(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Gestión de navegación automática
    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inProtectedGroup = segments[0] === '(student)' || segments[0] === '(validator)';

        if (user && userData && !inProtectedGroup) {
            if (userData.role === 'student') {
                router.replace('/(student)');
            } else if (userData.role === 'validator' || userData.role === 'admin') {
                router.replace('/(validator)/scanner');
            }
        } else if (!user && inProtectedGroup) {
            router.replace('/(auth)/login');
        }
    }, [user, userData, loading, segments]);

    const fetchUserData = async (uid: string) => {
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const fetchedData = {
                    uid: userDocSnap.id,
                    ...userDocSnap.data()
                } as UserData;
                setUserData(fetchedData);
            } else {
                console.warn("Documento de usuario no encontrado en Firestore");
                setUserData(null);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            setUserData(null);
        }
    };

    const login = async (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const register = async (email: string, password: string, additionalData: Partial<UserData>) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        const newUserData: UserData = {
            uid: result.user.uid,
            email: result.user.email!,
            role: additionalData.role || 'student',
            nombre: additionalData.nombre || '',
            apellido: additionalData.apellido || '',
            rut: additionalData.rut,
            carrera: additionalData.carrera,
            activo: true
        };

        await setDoc(doc(db, 'users', result.user.uid), {
            ...newUserData,
            fechaCreacion: new Date()
        });

        return result;
    };

    const updateUserData = async (data: Partial<UserData>) => {
        if (!user) throw new Error('No user logged in');
        await setDoc(doc(db, 'users', user.uid), data, { merge: true });
        await fetchUserData(user.uid);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const value = {
        user,
        userData,
        loading,
        login,
        register,
        logout,
        updateUserData,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
