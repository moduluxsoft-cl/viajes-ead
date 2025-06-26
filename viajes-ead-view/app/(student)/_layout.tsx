import { Stack } from 'expo-router';
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Redirect } from 'expo-router';

export default function StudentLayout() {
    const { userData, loading } = useAuth();

    if (loading) return null;

    if (!userData || userData.role !== 'student') {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="history" />
        </Stack>
    );
}