// app/(auth)/_layout.tsx
import { Stack, Redirect } from 'expo-router';
import React from 'react';
import {useAuth} from "@/contexts/AuthContext";
import {LoadingSpinner} from "@/components/ui/LoadingSpinner";

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
