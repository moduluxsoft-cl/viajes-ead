// components/ui/LogoutButton.tsx
import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {IoLogOutOutline} from "react-icons/io5";
import {useAuth} from '@/contexts/AuthContext';
import {useRouter} from 'expo-router';
import {ConfirmationModal} from './ConfirmationModal';

export const LogoutButton = () => {
    const { logout } = useAuth();
    const router = useRouter();
    const [isModalVisible, setIsModalVisible] = useState(false);

    const performLogout = async () => {
        setIsModalVisible(false); // Ocultamos el modal primero
        try {
            await logout();
            router.replace('/(auth)/login');
        } catch (error) {
        }
    };

    const handleLogoutPress = () => {
        setIsModalVisible(true);
    };

    return (
        <View>
            <TouchableOpacity onPress={handleLogoutPress} style={styles.button}>
                <IoLogOutOutline size={26} color="#BE031E" />
            </TouchableOpacity>

            <ConfirmationModal
                visible={isModalVisible}
                title="Cerrar Sesión"
                message="¿Estás seguro de que quieres cerrar sesión?"
                confirmText="Sí, Cerrar Sesión"
                onConfirm={performLogout}
                onCancel={() => setIsModalVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        marginRight: 16,
        padding: 4,
    },
});
