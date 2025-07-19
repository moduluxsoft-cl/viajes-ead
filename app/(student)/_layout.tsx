// app/(student)/_layout.tsx
import { Stack, Redirect } from 'expo-router';
import React from 'react';
import {LoadingSpinner} from "@/components/ui/LoadingSpinner";
import {useAuth} from "@/contexts/AuthContext";
import { LogoutButton } from '@/components/ui/LogoutButton'; // Importamos el nuevo botón

export default function StudentLayout() {
    const { loading, userData } = useAuth();

    if (!loading && (!userData || userData.role !== 'student')) {
        return <Redirect href="/(auth)/login" />;
    }

    if (loading) {
        return <LoadingSpinner message="Cargando..." />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: '#FFF7F8' },
                headerTintColor: '#2B2B2B',
                headerTitleAlign: 'center',
                headerShadowVisible: false,
                headerRight: () => <LogoutButton />,
            }}
        >
            <Stack.Screen
                name="index"
                options={{ title: 'Mi Pase QR' }}
            />
            <Stack.Screen
                name="history"
                options={{ title: 'Historial de Pases' }}
            />
        </Stack>
    );
}
