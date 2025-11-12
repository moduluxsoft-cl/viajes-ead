// app/_layout.tsx
import {Stack} from 'expo-router';
import React from 'react';
import {AuthProvider} from '@shared/contexts/AuthContext';
import {StatusBar} from 'expo-status-bar';
import {ToastContainer} from 'react-toastify';

export default function RootLayout() {
    return (
        <>
            <AuthProvider>
                <StatusBar style="auto" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: 'slide_from_right',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(student)" />
                    <Stack.Screen name="(validator)" />
                </Stack>
            </AuthProvider>
            <ToastContainer />
        </>
    );
}