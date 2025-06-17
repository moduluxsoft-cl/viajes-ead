import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useRouter, useSegments } from 'expo-router';
// Definimos el tipo de datos del contexto
interface AuthContextType {
    user: User | null;
    role: 'student' | 'validator' | 'admin' | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

// Creamos el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar el contexto fácilmente
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Proveedor del contexto
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'student' | 'validator' | 'admin' | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                // Usuario ha iniciado sesión
                setUser(currentUser);
                // Buscar su rol en Firestore
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setRole(userData.role);
                } else {
                    console.warn("User document not found in Firestore!");
                    setRole(null);
                }
            } else {
                // Usuario cerró sesión
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Efecto para gestionar la navegación
    useEffect(() => {
        if (loading) return; // No hacer nada mientras carga

        const inAuthenticatedRoute = segments[0] === '(student)' || segments[0] === '(validator)';

        if (user && !inAuthenticatedRoute) {
            // Si hay usuario pero no está en la app, redirigir
            if (role === 'student') {
                router.replace("/(student)");
            } else if (role === 'validator' || role === 'admin') {
                router.replace("/(validator)/scanner");
            }
        } else if (!user && inAuthenticatedRoute) {
            // Si no hay usuario pero está en una ruta protegida, redirigir a login
            router.replace("/(auth)/login");
        }
    }, [user, role, loading, segments]);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const value = {
        user,
        role,
        loading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
