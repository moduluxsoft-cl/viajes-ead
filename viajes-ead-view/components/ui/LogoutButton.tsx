// components/ui/LogoutButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export const LogoutButton = () => {
    const { logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres cerrar sesión?",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Sí, Cerrar Sesión",
                    onPress: () => logout(),
                    style: "destructive"
                }
            ]
        );
    };

    return (
        <TouchableOpacity onPress={handleLogout} style={styles.button}>
            <Ionicons name="log-out-outline" size={26} color="#BE031E" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        marginRight: 16,
        padding: 4,
    },
});
