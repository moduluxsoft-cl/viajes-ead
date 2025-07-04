import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {useAuth} from "@/contexts/AuthContext";
import {LoadingSpinner} from "@/components/ui/LoadingSpinner";

export default function ValidatorLayout() {
    const { loading, userData } = useAuth();

    // 1. Handle the loading state first to prevent any premature renders or redirects.
    if (loading) {
        return <LoadingSpinner message="Cargando..." />;
    }

    // 2. After loading is complete, check if the user is invalid for this layout.
    // If they are, redirect them.
    if (!userData || (userData.role !== 'validator' && userData.role !== 'admin')) {
        return <Redirect href="/(auth)/login" />;
    }

    // 3. If we reach this point, TypeScript knows that `userData` is not null.
    // We can now safely access `userData.role` without causing an error.
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#667eea',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: false,
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
            {/* This check is now safe because we've confirmed userData is not null above. */}
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
