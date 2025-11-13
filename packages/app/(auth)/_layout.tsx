// app/(auth)/_layout.tsx
import {Redirect, Stack} from 'expo-router';
import React from 'react';
import {useAuth} from "@shared/contexts/AuthContext";
import {LoadingSpinner} from "@shared/components/ui/LoadingSpinner";

export default function AuthLayout() {
    const { loading, userData } = useAuth();

    if (userData) {
        if (userData.role === 'student') {
            return <Redirect href="/(student)" />;
        }
        return <Redirect href="/(validator)/scanner" />;
    }

    if (loading) {
        return <LoadingSpinner message="Cargando..." />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
