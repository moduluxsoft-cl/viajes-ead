// app/(validator)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function ValidatorLayout() {
    const { userData } = useAuth();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#667eea',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: false, // Las pantallas individuales ya tienen su propio encabezado
            }}
        >
            <Tabs.Screen
                name="scanner"
                options={{
                    title: 'Escanear',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="scan" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Usuarios',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" color={color} size={size} />
                    ),
                }}
            />

 {userData?.role === 'admin' ? (
                <Tabs.Screen
                    name="configuracion"
                    options={{
                        title: 'Configurar',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="settings" color={color} size={size} />
                        ),
                    }}
                />
            ) : null}
        </Tabs>
    );
}
