// app/(student)/_layout.tsx
import {Redirect, Stack} from 'expo-router';
import React from 'react';
import {LoadingSpinner} from "@shared/components/ui/LoadingSpinner";
import {useAuth} from "@shared/contexts/AuthContext";
import {StyleSheet, View, ViewStyle} from "react-native";
import {LogoutButton} from "@shared/components/ui/LogoutButton";
import {Header} from "@shared/components/ui/Header";

export default function StudentLayout() {
    const { loading, userData } = useAuth();
    if (loading || !userData) {
        return <LoadingSpinner message="Cargando..." />;
    }
    if (!loading && (userData?.role !== 'student')) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                header: () => (
                    <Header
                        title="Mi Pase QR"
                        subtitle={`Hola ${userData.nombre} ${userData.apellido}!`}
                    />
                ),
            }}
        >
            <Stack.Screen
                name="index"
                options={{ title: 'Mi Pase QR' }}
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
