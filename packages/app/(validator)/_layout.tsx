// app/(validator)/_layout.tsx
import React from 'react';
import {Redirect, Stack, Tabs} from 'expo-router';
import {IoPeople, IoScan, IoSettings, IoDocumentText} from "react-icons/io5";
import {useAuth} from "@shared/contexts/AuthContext";
import {LoadingSpinner} from "@shared/components/ui/LoadingSpinner";
import {LogoutButton} from '@shared/components/ui/LogoutButton';
import {AdminHeader} from "@shared/components/ui/AdminHeader";

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
            <Stack
                screenOptions={{
                    headerShown: true,
                    header: () => (
                        <AdminHeader
                            title="Validador de Pases"
                            subtitle={`Hola ${userData.nombre} ${userData.apellido}!`}
                        />
                    ),
                }}
            >
                <Stack.Screen name="scanner" />
                <Stack.Screen name="users" options={{ headerShown: false }} />
                <Stack.Screen name="configuracion" options={{ headerShown: false }} />
            </Stack>
        );
    }

    if (userData.role === 'admin') {
        return (
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: '#BE031E',
                    tabBarInactiveTintColor: '#9ca3af',
                    headerShown: true,
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
                            <IoScan color={color} size={size} />
                        ),
                        header: () => (
                            <AdminHeader
                                title="Validador de Pases"
                                subtitle={`Hola ${userData.nombre} ${userData.apellido}!`}
                            />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="users"
                    options={{
                        title: 'Usuarios',
                        tabBarIcon: ({ color, size }) => (
                            <IoPeople color={color} size={size} />
                        ),
                        header: () => (
                            <AdminHeader title="Gestión de Usuarios" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="configuracion"
                    options={{
                        title: 'Configurar',
                        tabBarIcon: ({ color, size }) => (
                            <IoSettings color={color} size={size} />
                        ),
                        header: () => (
                            <AdminHeader
                                title="Configuraciones Viaje"
                                subtitle="Parámetros del próximo viaje disponible."
                            />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="reporteria"
                    options={{
                        title: 'Reportería',
                        tabBarIcon: ({ color, size }) => (
                            <IoDocumentText color={color} size={size} />
                        ),
                        header: () => (
                            <AdminHeader title="Reportería de Auditoría" />
                        ),
                    }}
                />
            </Tabs>
        );
    }
}
