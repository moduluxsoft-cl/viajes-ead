import { Stack, Redirect } from 'expo-router';
import React from 'react';
import {LoadingSpinner} from "@/components/ui/LoadingSpinner";
import {useAuth} from "@/contexts/AuthContext";


export default function StudentLayout() {
    const { loading, userData } = useAuth();

    // If the user is not authenticated or not a student, redirect to login.
    if (!loading && (!userData || userData.role !== 'student')) {
        return <Redirect href="/(auth)/login" />;
    }

    // While checking, show a loading screen
    if (loading) {
        return <LoadingSpinner message="Cargando..." />;
    }

    // If authenticated and is a student, show the student screens.
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="history" />
        </Stack>
    );
}
