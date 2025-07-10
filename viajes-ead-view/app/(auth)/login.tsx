import React, {useEffect, useState} from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {useAuth} from '@/contexts/AuthContext';
import {FirebaseError} from 'firebase/app';
import {enviarEmailRecuperacion} from '@/src/services/usersService';
import {useLocalSearchParams} from "expo-router";
import {EadLogo} from "@/assets/icons/ead-logo";
import PucvLogo from "@/assets/icons/pucv-logo"; // Importamos la función

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { logout } = useLocalSearchParams();
    const [showLogoutMessage, setShowLogoutMessage] = useState(false);
    // --- Estados para el modal de recuperación ---
    const [modalVisible, setModalVisible] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetStatus, setResetStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    // -------------------------------------------
    useEffect(() => {
        if (logout === 'true') {
            setShowLogoutMessage(true);
            setTimeout(() => setShowLogoutMessage(false), 3000);
        }
    }, [logout]);
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
        return true;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            await login(email.trim().toLowerCase(), password);
        } catch (error) {
            const errorMessage = error instanceof FirebaseError
                ? getErrorMessage(error)
                : 'Error inesperado';
            Alert.alert('Error de autenticación', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // --- Lógica mejorada para el envío del correo ---
    const handlePasswordReset = async () => {
        if (!resetEmail.trim()) {
            setResetStatus({ type: 'error', message: 'Por favor, ingresa tu correo electrónico.' });
            return;
        }
        setResetLoading(true);
        try {
            await enviarEmailRecuperacion(resetEmail.trim().toLowerCase());
            setResetStatus({
                type: 'success',
                message: '¡Correo enviado! Revisa tu bandeja de entrada (y la carpeta de spam) para ver el enlace de recuperación.'
            });
        } catch (error: any) {
            setResetStatus({ type: 'error', message: error.message });
        } finally {
            setResetLoading(false);
        }
    };

    // --- Función para cerrar y resetear el modal ---
    const closeModalAndReset = () => {
        setModalVisible(false);
        // Pequeño delay para que el usuario no vea el reseteo de estado al cerrar
        setTimeout(() => {
            setResetEmail('');
            setResetStatus(null);
        }, 300);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFF7F8' }}>
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
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', maxHeight: 200 }}>
                            <EadLogo width={100}/>
                            <PucvLogo width={100} height={100}/>
                        </View>
                        <Card style={styles.loginCard}>
                            {showLogoutMessage && (
                                <View style={styles.successMessage}>
                                    <Text style={styles.successMessageText}>
                                        ✓ Has cerrado sesión exitosamente
                                    </Text>
                                </View>
                            )}
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

                            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.forgotPasswordButton}>
                                <Text style={styles.forgotPasswordText}>
                                    ¿Olvidaste tu contraseña?
                                </Text>
                            </TouchableOpacity>
                        </Card>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* --- Modal de Recuperación Mejorado --- */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={closeModalAndReset}
                >
                    <View style={styles.modalCenteredView}>
                        <View style={styles.modalView}>
                            {resetStatus ? (
                                <>
                                    <Text style={styles.modalTitle}>
                                        {resetStatus.type === 'success' ? 'Éxito' : 'Error'}
                                    </Text>
                                    <Text style={[
                                        styles.modalText,
                                        resetStatus.type === 'success' ? styles.successText : styles.errorText
                                    ]}>
                                        {resetStatus.message}
                                    </Text>
                                    <Button
                                        title="Cerrar"
                                        onPress={closeModalAndReset}
                                        style={styles.modalButton}
                                    />
                                </>
                            ) : (
                                <>
                                    <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
                                    <Text style={styles.modalText}>
                                        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                                    </Text>
                                    <Input
                                        label="Correo Electrónico"
                                        placeholder="tu@email.cl"
                                        value={resetEmail}
                                        onChangeText={setResetEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        containerStyle={{ width: '100%' }}
                                    />
                                    <Button
                                        title="Enviar Correo"
                                        onPress={handlePasswordReset}
                                        loading={resetLoading}
                                        style={styles.modalButton}
                                    />
                                    <Button
                                        title="Cancelar"
                                        onPress={closeModalAndReset}
                                        variant="outline"
                                        style={styles.modalButton}
                                    />
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        flexDirection: 'column',
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
        color: '#2B2B2B',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#2B2B2B',
        opacity: 0.9,
    },
    loginCard: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    loginButton: {
        marginTop: 8,
        backgroundColor: '#BE031E',
    },
    forgotPasswordButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    forgotPasswordText: {
        color: '#BE031E',
        fontSize: 14,
        fontWeight: '600',
    },
    modalCenteredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
        color: '#6b7280',
        fontSize: 16,
        lineHeight: 22,
    },
    modalButton: {
        width: '100%',
        marginTop: 10,
        backgroundColor: '#BE031E',
    },
    successText: {
        color: '#10b981', // Verde
        fontWeight: '600'
    },
    errorText: {
        color: '#ef4444', // Rojo
        fontWeight: '600'
    },
    successMessage: {
        backgroundColor: '#10b981',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    successMessageText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600',
    },
});
