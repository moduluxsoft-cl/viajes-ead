import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { UserListItem } from '../../components/UserListItem';

const initialUsers = [
    { email: 'maria.gonzalez@universidad.cl', name: 'María González', role: 'student' as const },
    { email: 'pedro.martinez@universidad.cl', name: 'Pedro Martínez', role: 'student' as const },
    { email: 'inspector.lopez@universidad.cl', name: 'Ana López', role: 'validator' as const },
];

export default function UsersScreen() {
    const router = useRouter();
    const [users, setUsers] = useState(initialUsers);
    const [newUser, setNewUser] = useState({
        email: '',
        name: '',
        role: 'student' as 'student' | 'validator',
    });

    const handleLogout = () => {
        router.replace('/login');
    };

    const handleAddUser = () => {
        if (newUser.email && newUser.name) {
            setUsers([...users, { ...newUser }]);
            setNewUser({ email: '', name: '', role: 'student' });
        }
    };

    const handleDeleteUser = (index: number) => {
        setUsers(users.filter((_, i) => i !== index));
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header
                title="Gestión de Usuarios"
                rightAction={{ label: 'Salir', onPress: handleLogout }}
            />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Button
                    title="Subir CSV"
                    variant="secondary"
                    onPress={() => {}}
                    style={styles.csvButton}
                />

                <Card style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Agregar Usuario</Text>
                    <Input
                        label="Email"
                        placeholder="usuario@universidad.cl"
                        value={newUser.email}
                        onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <Input
                        label="Nombre Completo"
                        placeholder="Nombre Apellido"
                        value={newUser.name}
                        onChangeText={(text) => setNewUser({ ...newUser, name: text })}
                    />
                    <View style={styles.roleSelector}>
                        <Text style={styles.roleLabel}>Rol:</Text>
                        <View style={styles.roleButtons}>
                            <Button
                                title="Estudiante"
                                variant={newUser.role === 'student' ? 'primary' : 'secondary'}
                                onPress={() => setNewUser({ ...newUser, role: 'student' })}
                                style={styles.roleButton}
                            />
                            <Button
                                title="Validador"
                                variant={newUser.role === 'validator' ? 'primary' : 'secondary'}
                                onPress={() => setNewUser({ ...newUser, role: 'validator' })}
                                style={styles.roleButton}
                            />
                        </View>
                    </View>
                    <Button title="Agregar Usuario" onPress={handleAddUser} />
                </Card>

                <Text style={styles.listTitle}>Usuarios Autorizados ({users.length})</Text>
                {users.map((user, index) => (
                    <UserListItem
                        key={index}
                        user={user}
                        onDelete={() => handleDeleteUser(index)}
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    csvButton: {
        marginBottom: 20,
    },
    formCard: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    roleSelector: {
        marginBottom: 16,
    },
    roleLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    roleButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    roleButton: {
        flex: 1,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
        marginTop: 20,
    },
});