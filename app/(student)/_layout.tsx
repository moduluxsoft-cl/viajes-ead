// app/(student)/_layout.tsx
import { Stack, Redirect } from 'expo-router';
import React from 'react';
import {LoadingSpinner} from "@/components/ui/LoadingSpinner";
import {useAuth} from "@/contexts/AuthContext";
import { LogoutButton } from '@/components/ui/LogoutButton';
import {StyleSheet, View, ViewStyle, Text} from "react-native";

export default function StudentLayout() {
    const { loading, userData } = useAuth();
    const TEST_USER_UID = 'D7G9KmuVyZYLxUVSlsFf5f2VJi63';

    if (loading || !userData) {
        return <LoadingSpinner message="Cargando..." />;
    }
    if (!loading && (!userData || userData.role !== 'student')) {
        return <Redirect href="/(auth)/login" />;
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

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
}

const Card = ({ children, style }: CardProps) => (
    <View style={[styles.card, style]}>
        {children}
    </View>
);

const styles = StyleSheet.create({
    card: {
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
    },
});
