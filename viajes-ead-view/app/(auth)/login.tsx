import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { FirebaseError } from 'firebase/app';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const getErrorMessage = (error: FirebaseError) => {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'Usuario no encontrado';
            case 'auth/wrong-password':
                return 'Contraseña incorrecta';
            case 'auth/invalid-email':
                return 'Email inválido';
            case 'auth/user-disabled':
                return 'Usuario deshabilitado';
            case 'auth/too-many-requests':
                return 'Demasiados intentos fallidos. Intenta más tarde';
            default:
                return 'Error de autenticación';
        }
    };

    const validateForm = () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
            return false;
        }
        if (!password.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu contraseña');
            return false;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return false;
        }
        return true;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            await login(email.trim().toLowerCase(), password);
            // La navegación será manejada por AuthContext
        } catch (error) {
            const errorMessage = error instanceof FirebaseError
                ? getErrorMessage(error)
                : 'Error inesperado';

            Alert.alert('Error de autenticación', errorMessage);
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
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.header}>
                            <Text style={styles.title}>Viajes EAD</Text>
                            <Text style={styles.subtitle}>Sistema de Pases Escolares</Text>
                        </View>

                        <Card style={styles.loginCard}>
                            <Input
                                label="Correo Electrónico"
                                placeholder="tu@email.cl"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                            <Input
                                label="Contraseña"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoComplete="password"
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
                    </ScrollView>
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
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
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
        opacity: 0.9,
    },
    loginCard: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
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