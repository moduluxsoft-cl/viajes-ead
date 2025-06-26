// app/(validator)/users.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, UserData } from '../../contexts/AuthContext';
import { UserFormModal } from '../../components/forms/UserFormModal';
import {
    obtenerEstudiantes,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuarioComoAdmin,
    desactivarUsuario,
    reactivarUsuario,
    enviarEmailRecuperacion
} from '../../src/services/usersService';
import { useFocusEffect } from 'expo-router';

export default function UsersScreen() {
    const { userData: currentUser } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const usersData = await obtenerEstudiantes();
            setUsers(usersData);
            setFilteredUsers(usersData);
        } catch (error) { Alert.alert('Error', 'No se pudieron cargar los usuarios.'); }
        finally { setLoading(false); }
    };

    useFocusEffect(useCallback(() => { loadUsers(); }, []));

    useEffect(() => {
        const filtered = users.filter(user =>
            `${user.nombre} ${user.apellido}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.rut?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    const handleOpenModal = (user: UserData | null = null) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedUser(null);
    };

    const handleSaveUser = async (userToSave: Partial<UserData>, password?: string) => {
        setSaving(true);
        try {
            if (selectedUser) {
                await actualizarUsuario(selectedUser.uid, userToSave);
            } else {
                await crearUsuario(userToSave as Omit<UserData, 'uid'>, password!);
            }
            handleCloseModal();
            await loadUsers();
            Alert.alert("Éxito", `Usuario ${selectedUser ? 'actualizado' : 'creado'} correctamente.`);
        } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Ocurrió un error.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActivo = async (user: UserData) => {
        const action = user.activo ? 'desactivar' : 'reactivar';
        const actionFn = user.activo ? desactivarUsuario : reactivarUsuario;
        Alert.alert(`Confirmar`, `¿Seguro que quieres ${action} a ${user.nombre}?`, [
            { text: 'Cancelar' },
            { text: 'Confirmar', onPress: async () => {
                    try {
                        await actionFn(user.uid);
                        await loadUsers();
                        Alert.alert('Éxito', `Usuario ${action}do.`);
                    } catch { Alert.alert('Error', `No se pudo ${action} al usuario.`); }
                }}
        ]);
    };

    const handleResetPassword = (email: string) => {
        Alert.alert('Recuperar Contraseña', `¿Enviar un email de recuperación a ${email}?`, [
            { text: 'Cancelar' },
            { text: 'Enviar', onPress: async () => {
                    try {
                        await enviarEmailRecuperacion(email);
                        Alert.alert('Email Enviado', `Se ha enviado un enlace de recuperación a ${email}.`);
                    } catch { Alert.alert('Error', 'No se pudo enviar el email.'); }
                }}
        ]);
    };

    const handleDeleteUser = (user: UserData) => {
        Alert.alert("Confirmar Eliminación", `Vas a eliminar a ${user.nombre} de la base de datos, pero su cuenta de autenticación seguirá existiendo. ¿Continuar?`, [
            { text: 'Cancelar' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try {
                        await eliminarUsuarioComoAdmin(user.uid);
                        await loadUsers();
                        Alert.alert("Éxito", "Usuario eliminado de Firestore.");
                    } catch { Alert.alert("Error", "No se pudo eliminar el usuario."); }
                }}
        ]);
    };

    const renderUser = ({ item }: { item: UserData }) => (
        <Card style={styles.userCard}>
            <View style={styles.userHeader}>
                <Text style={styles.userName}>{item.nombre} {item.apellido}</Text>
                <View style={[styles.statusIndicator, item.activo ? styles.activeStatus : styles.inactiveStatus]} />
            </View>
            <Text style={styles.userDetail}>RUT: {item.rut}</Text>
            <Text style={styles.userDetail}>Email: {item.email}</Text>

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenModal(item)}>
                    <Ionicons name="pencil" size={20} color="#6366f1" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleActivo(item)}>
                    <Ionicons name={item.activo ? "eye-off" : "eye"} size={20} color={item.activo ? "#f59e0b" : "#10b981"} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleResetPassword(item.email)}>
                    <Ionicons name="key" size={20} color="#0ea5e9" />
                </TouchableOpacity>
                {currentUser?.role === 'admin' && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteUser(item)}>
                        <Ionicons name="trash" size={20} color="#ef4444" />
                    </TouchableOpacity>
                )}
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.title}>Gestión de Usuarios</Text></View>
            <View style={styles.controlsContainer}>
                <TextInput style={styles.searchInput} placeholder="Buscar..." value={searchQuery} onChangeText={setSearchQuery} />
                <Button title="Añadir" onPress={() => handleOpenModal()} style={styles.addButton} />
            </View>
            <FlatList
                data={filteredUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No se encontraron usuarios</Text></View>}
            />
            <UserFormModal visible={modalVisible} onClose={handleCloseModal} onSubmit={handleSaveUser} initialData={selectedUser} saving={saving} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { backgroundColor: '#667eea', padding: 20, paddingTop: 40 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
    controlsContainer: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db', marginRight: 10 },
    addButton: { paddingHorizontal: 16 },
    listContainer: { paddingHorizontal: 16, paddingBottom: 16 },
    userCard: { marginBottom: 12 },
    userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    statusIndicator: { width: 12, height: 12, borderRadius: 6 },
    activeStatus: { backgroundColor: '#10b981' },
    inactiveStatus: { backgroundColor: '#ef4444' },
    userDetail: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
    actionsContainer: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10, marginTop: 10 },
    actionButton: { paddingHorizontal: 10 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { fontSize: 16, color: '#6b7280' },
});
