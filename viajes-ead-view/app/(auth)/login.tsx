import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            // No need to redirect here, AuthContext will handle it
        } catch (error) {
            setLoading(false);
            Alert.alert('Error de autenticación', 
                error instanceof Error ? error.message : 'Hubo un problema al iniciar sesión');
        }
    };

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.gradient}
        >
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
                                loading={loading}
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