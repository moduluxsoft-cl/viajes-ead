// app/(validator)/_layout.tsx
import React from 'react';
import { Tabs, Redirect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LogoutButton } from '@/components/ui/LogoutButton'; // Importamos el botón

export default function ValidatorLayout() {
    const { loading, userData } = useAuth();

    if (loading) {
        return <LoadingSpinner message="Cargando..." />;
    }

    if (!userData || (userData.role !== 'validator' && userData.role !== 'admin')) {
        return <Redirect href="/(auth)/login" />;
    }

    if (userData.role === 'validator') {
        return (
            <Stack>
                <Stack.Screen
                    name="scanner"
                    options={{
                        title: 'Validador de Pases',
                        headerShown: true,
                        headerStyle: { backgroundColor: '#FFFFFF' },
                        headerTintColor: '#2B2B2B',
                        headerTitleAlign: 'center',
                        headerShadowVisible: false,
                        headerRight: () => <LogoutButton />,
                    }}
                />
                <Stack.Screen name="users" options={{ headerShown: false }} />
                <Stack.Screen name="configuracion" options={{ headerShown: false }} />
            </Stack>
        );
    }

    // --- LÓGICA PARA ROL 'ADMIN' ---
    // El rol 'admin' puede ver todas las pestañas.
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#BE031E',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: true, // Mostramos la cabecera
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerTintColor: '#2B2B2B',
                headerTitleAlign: 'center',
                headerShadowVisible: false,
                headerRight: () => <LogoutButton />, // Añadimos el botón de logout
                tabBarStyle: {
                    height: 60,
                    paddingBottom: 5,
                },
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
            {userData.role === 'admin' && (
                <>
                    <Tabs.Screen
                        name="users"
                        options={{
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="people" color={color} size={size} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="configuracion"
                        options={{
                            title: 'Configurar',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="settings" color={color} size={size} />
                            ),
                        }}
                    />
                </>
            )}
        </Tabs>
    );
}
