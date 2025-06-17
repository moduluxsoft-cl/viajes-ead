import React, { useState } from 'react';
import {View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Por favor, ingresa correo y contraseña.");
            return;
        }
        setLoading(true);
        try {
            // Llamar a la función de login del contexto
            await login(email, password);
            // La redirección es automática gracias al AuthContext
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error de inicio de sesión", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.content}>
                        <Text style={styles.title}>Viajes EAD</Text>
                        <Text style={styles.subtitle}>Sistema de Pases Escolares</Text>

                        <Card style={styles.loginCard}>
                            <Input
                                label="Correo Electrónico"
                                placeholder="tu@email.cl"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <Input
                                label="Contraseña"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                            <Button
                                title="Iniciar Sesión"
                                onPress={handleLogin}
                                loading={loading} // Pasar el estado de carga
                                style={styles.loginButton}
                            />
                            <Text style={styles.helpText}>
                                ¿No puedes ingresar? Contacta al administrador
                            </Text>
                        </Card>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#fff',
        marginBottom: 40,
        opacity: 0.9,
    },
    loginCard: {
        width: '100%',
        maxWidth: 400,
    },
    loginButton: {
        marginTop: 8,
    },
    helpText: {
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 14,
        marginTop: 16,
    },
});

// app/(student)/_layout.tsx
import { Stack } from 'expo-router';
import {useAuth} from "@/contexts/AuthContext";

function StudentLayout(){
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    );
}
