import React, { useState, useCallback, useEffect  } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TextInput,
    Alert,
    TouchableOpacity,
    Platform, Modal,
    Pressable
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, UserData } from '../../contexts/AuthContext';
import { UserFormModal } from '../../components/forms/UserFormModal';
import { CSVResultModal } from '../../components/modals/CSVResultModal';
import {
    obtenerEstudiantes,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    reactivarUsuario,
    enviarEmailRecuperacion,
    eliminarUsuarioComoAdmin,
    crearUsuariosDesdeCSV,
    BatchResult
} from '../../src/services/usersService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function UsersScreen() {
    const { userData: currentUser } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [csvResult, setCsvResult] = useState<BatchResult | null>(null);
    const [showCsvResultModal, setShowCsvResultModal] = useState(false);

    const [csvContent, setCsvContent] = useState<string>('');
    const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const usersData = await obtenerEstudiantes();
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to load users:", error);
            Alert.alert('Error', 'No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user =>
                `${user.nombre} ${user.apellido}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.rut && user.rut.toLowerCase().includes(searchQuery.toLowerCase())) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
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
                await crearUsuario(userToSave as Omit<UserData, 'uid' | 'activo' | 'fechaCreacion'>, password!);
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
            {
                text: 'Confirmar', onPress: async () => {
                    try {
                        await actionFn(user.uid);
                        await loadUsers();
                        Alert.alert('Éxito', `Usuario ${action}do.`);
                    } catch { Alert.alert('Error', `No se pudo ${action} al usuario.`); }
                }
            }
        ]);
    };

    const handleResetPassword = (email: string) => {
        Alert.alert('Recuperar Contraseña', `¿Enviar un email de recuperación a ${email}?`, [
            { text: 'Cancelar' },
            {
                text: 'Enviar', onPress: async () => {
                    try {
                        await enviarEmailRecuperacion(email);
                        Alert.alert('Email Enviado', `Se ha enviado un enlace de recuperación a ${email}.`);
                    } catch { Alert.alert('Error', 'No se pudo enviar el email.'); }
                }
            }
        ]);
    };

    const handleDeleteUser = (user: UserData) => {
        Alert.alert("Confirmar Eliminación", `Vas a eliminar a ${user.nombre} de Firestore. Esta acción no se puede deshacer.`, [
            { text: 'Cancelar' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try {
                        await eliminarUsuarioComoAdmin(user.uid);
                        await loadUsers();
                        Alert.alert("Éxito", "Usuario eliminado de Firestore.");
                    } catch { Alert.alert("Error", "No se pudo eliminar el usuario."); }
                }
            }
        ]);
    };

    const handleCsvUpload = async () => {
        setIsUploading(true);
        try {
            const pickerResult = await DocumentPicker.getDocumentAsync({
                type: 'text/csv',
                copyToCacheDirectory: true,
            });

            if (pickerResult.canceled) {
                setIsUploading(false);
                return;
            }

            const asset = pickerResult.assets[0];
            let fileText = '';

            if (Platform.OS === 'web') {
                const file = asset.file;
                if (!file) throw new Error("No se pudo recuperar el archivo en la web.");
                fileText = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = () => reject(new Error("Error al leer el archivo."));
                    reader.readAsText(file);
                });
            } else {
                fileText = await FileSystem.readAsStringAsync(asset.uri);
            }

            // 1. Guarda el contenido del archivo en el estado
            setCsvContent(fileText);
            // 2. Muestra el modal de confirmación
            setConfirmModalVisible(true);

        } catch (error) {
            Alert.alert("Error de Carga", error instanceof Error ? error.message : "No se pudo procesar el archivo.");
        } finally {
            // Detenemos el spinner de carga aquí, el modal se encargará del resto
            setIsUploading(false);
        }
    };
    const handleConfirmCsvUpload = async () => {
        // Cierra el modal y muestra el spinner del botón de nuevo
        setConfirmModalVisible(false);
        setIsUploading(true);

        try {
            if (!csvContent) {
                throw new Error("El contenido del CSV está vacío.");
            }

            const result = await crearUsuariosDesdeCSV(csvContent);
            setCsvResult(result);
            setShowCsvResultModal(true); // Muestra el modal de resultados
            await loadUsers(); // Recarga la lista de usuarios

        } catch (serviceError) {
            const message = serviceError instanceof Error ? serviceError.message : "Ocurrió un error al procesar los datos.";
            Alert.alert("Error en Procesamiento", message);
        } finally {
            setIsUploading(false); // Detiene el spinner al finalizar
            setCsvContent(''); // Limpia el contenido
        }
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

    if (loading) return <LoadingSpinner message="Cargando usuarios..." />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.title}>Gestión de Usuarios</Text></View>
            <View style={styles.controlsContainer}>
                <TextInput style={styles.searchInput} placeholder="Buscar por nombre, RUT o email..." value={searchQuery} onChangeText={setSearchQuery} />
                <Button title="Añadir" onPress={() => handleOpenModal()} style={styles.addButton} textStyle={{fontSize: 14}}/>
                <Button
                    title="Cargar CSV"
                    onPress={handleCsvUpload}
                    style={styles.csvButton}
                    textStyle={{fontSize: 14}}
                    loading={isUploading}
                    disabled={isUploading}
                />
            </View>
            <FlatList
                data={filteredUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No se encontraron usuarios</Text></View>}
            />
            <UserFormModal visible={modalVisible} onClose={handleCloseModal} onSubmit={handleSaveUser} initialData={selectedUser} saving={saving} />

            <CSVResultModal
                visible={showCsvResultModal}
                onClose={() => setShowCsvResultModal(false)}
                result={csvResult}
            />
            <Modal
                transparent={true}
                animationType="fade"
                visible={isConfirmModalVisible}
                onRequestClose={() => setConfirmModalVisible(false)}
            >
                <View style={styles.modalCenteredView}>
                    <View style={styles.confirmationModalView}>
                        <Text style={styles.modalTitle}>Confirmar Carga</Text>
                        <Text style={styles.modalText}>
                            Estás a punto de procesar un archivo CSV para crear nuevos usuarios. ¿Deseas continuar?
                        </Text>
                        <View style={styles.modalButtonContainer}>
                            <Pressable
                                style={[styles.modalButton, styles.buttonCancel]}
                                onPress={() => setConfirmModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.buttonConfirm]}
                                onPress={handleConfirmCsvUpload}
                            >
                                <Text style={styles.buttonText}>Confirmar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { backgroundColor: '#667eea', padding: 20, paddingTop: 40 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
    controlsContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db' },
    addButton: { paddingHorizontal: 12, backgroundColor: '#10b981'},
    csvButton: { paddingHorizontal: 12, backgroundColor: '#3b82f6'},
    listContainer: { paddingHorizontal: 16, paddingBottom: 16 },
    userCard: { marginBottom: 12 },
    userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    userDetail: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
    statusIndicator: { width: 12, height: 12, borderRadius: 6 },
    activeStatus: { backgroundColor: '#10b981' },
    inactiveStatus: { backgroundColor: '#ef4444' },
    actionsContainer: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10, marginTop: 10 },
    actionButton: { paddingHorizontal: 10 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { fontSize: 16, color: '#6b7280' },
    modalCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    confirmationModalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    modalText: {
        marginBottom: 20,
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        elevation: 2,
        flex: 1,
        marginHorizontal: 8,
    },
    buttonCancel: {
        backgroundColor: '#6b7280', // Gris
    },
    buttonConfirm: {
        backgroundColor: '#10b981', // Verde
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
});