// app/(validator)/_layout.tsx
import React from 'react';
import {Redirect, Stack, Tabs} from 'expo-router';
import {IoPeople, IoScan, IoSettings, IoDocumentText} from "react-icons/io5";
import {useAuth} from "@shared/contexts/AuthContext";
import {LoadingSpinner} from "@shared/components/ui/LoadingSpinner";
import {LogoutButton} from '@shared/components/ui/LogoutButton';

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
                        title: '',
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

    if (userData.role === 'admin') {
        return (
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: '#BE031E',
                    tabBarInactiveTintColor: '#9ca3af',
                    headerShown: true,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                    headerTintColor: '#2B2B2B',
                    headerTitleAlign: 'center',
                    headerShadowVisible: false,
                    headerRight: () => <LogoutButton />,
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
                    }}
                />
                <Tabs.Screen
                    name="users"
                    options={{
                        title: 'Usuarios',
                        tabBarIcon: ({ color, size }) => (
                            <IoPeople color={color} size={size} />
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
                    }}
                />
                <Tabs.Screen
                    name="reporteria"
                    options={{
                        title: 'Reportería',
                        tabBarIcon: ({ color, size }) => (
                            <IoDocumentText color={color} size={size} />
                        ),
                    }}
                />
            </Tabs>
        )
    }
}
