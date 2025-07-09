import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ValidatorLayout() {
    const { loading, userData } = useAuth();

    if (loading) {
        return <LoadingSpinner message="Cargando..." />;
    }

    if (!userData || (userData.role !== 'validator' && userData.role !== 'admin')) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#BE031E',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: false,
                tabBarStyle: {
                    height: 60,
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
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Usuarios',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" color={color} size={size} />
                    ),
                }}
            />
            {userData.role === 'admin' && (
                <Tabs.Screen
                    name="configuracion"
                    options={{
                        title: 'Configurar',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="settings" color={color} size={size} />
                        ),
                    }}
                />
            )}
        </Tabs>
    );
}
