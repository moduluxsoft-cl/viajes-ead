import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {onAuthStateChanged, signInWithEmailAndPassword, signOut, User, UserCredential} from 'firebase/auth';
import {doc, getDoc, Timestamp} from 'firebase/firestore';
import {auth, db} from '@/config/firebase';
import {Alert} from 'react-native';

export interface UserData {
    uid: string;
    email: string;
    role: 'student' | 'validator' | 'admin';
    nombre: string;
    apellido: string;
    rut?: string;
    carrera?: string;
    activo: boolean;
    fechaCreacion: Timestamp;
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<UserCredential>;
    logout: () => Promise<void>;
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                await fetchUserData(currentUser);
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchUserData = async (currentUser: User) => {
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().activo) {
                setUser(currentUser);
                setUserData({ uid: currentUser.uid, ...userDocSnap.data() } as UserData);
            } else {
                if(userDocSnap.exists() && !userDocSnap.data().activo) {
                    Alert.alert("Cuenta Desactivada", "Tu cuenta ha sido desactivada por un administrador.");
                }
                await signOut(auth);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            await signOut(auth);
        }
    };

    const login = (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "No se pudo cerrar la sesión.");
        }
    };

    const value = { user, userData, loading, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
