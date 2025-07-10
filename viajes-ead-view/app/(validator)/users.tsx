import React, {useCallback, useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {Card} from '@/components/ui/Card';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import {Button} from '@/components/ui/Button';
import {Ionicons} from '@expo/vector-icons';
import {useAuth, UserData} from '@/contexts/AuthContext';
import {UserFormModal} from '@/components/forms/UserFormModal';
import {CSVResultModal} from '@/components/modals/CSVResultModal';
import {
    actualizarUsuario,
    BatchResult,
    crearUsuario,
    crearUsuariosDesdeCSV,
    desactivarUsuario,
    eliminarUsuarioComoAdmin,
    enviarEmailRecuperacion,
    obtenerEstudiantes,
    reactivarUsuario
} from '@/src/services/usersService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {EadLogo} from "@/assets/icons/ead-logo";
import PucvLogo from "@/assets/icons/pucv-logo";

// --- TIPO PARA MANEJAR ACCIONES ---
type ActionToConfirm = {
    type: 'toggle' | 'delete' | 'resetPassword';
    user: UserData;
} | null;

// --- COMPONENTE DE MODAL DE CONFIRMACIÓN REUTILIZABLE ---
const ConfirmationModal = ({
                               visible,
                               onClose,
                               onConfirm,
                               title,
                               message,
                               confirmButtonText = "Confirmar",
                               isDestructive = false
                           }: {
    visible: boolean,
    onClose: () => void,
    onConfirm: () => void,
    title: string,
    message: string,
    confirmButtonText?: string,
    isDestructive?: boolean
}) => (
    <Modal
        transparent={true}
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
    >
        <View style={styles.modalCenteredView}>
            <View style={styles.confirmationModalView}>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalText}>{message}</Text>
                <View style={styles.modalButtonContainer}>
                    <Pressable
                        style={[styles.modalButton, styles.buttonCancel]}
                        onPress={onClose}
                    >
                        <Text style={styles.buttonText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.modalButton, isDestructive ? styles.buttonDelete : styles.buttonConfirm]}
                        onPress={onConfirm}
                    >
                        <Text style={styles.buttonText}>{confirmButtonText}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    </Modal>
);


export default function UsersScreen() {
    const { userData: currentUser } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [csvResult, setCsvResult] = useState<BatchResult | null>(null);
    const [showCsvResultModal, setShowCsvResultModal] = useState(false);
    const [csvContent, setCsvContent] = useState<string>('');
    const [isCsvConfirmModalVisible, setCsvConfirmModalVisible] = useState(false);

    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // --- ESTADOS PARA EL NUEVO MODAL DE CONFIRMACIÓN ---
    const [actionToConfirm, setActionToConfirm] = useState<ActionToConfirm>(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const usersData = await obtenerEstudiantes();
            setUsers(usersData);
            setFilteredUsers(usersData);
        } catch (error) {
            console.error("Failed to load users:", error);
            Alert.alert('Error', 'No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers(users);
        } else {
            const lowercasedQuery = searchQuery.toLowerCase();
            const filtered = users.filter(user =>
                `${user.nombre} ${user.apellido}`.toLowerCase().includes(lowercasedQuery) ||
                (user.rut && user.rut.toLowerCase().includes(lowercasedQuery)) ||
                user.email.toLowerCase().includes(lowercasedQuery)
            );
            setFilteredUsers(filtered);
        }
    }, [searchQuery, users]);

    const handleOpenEditModal = (user: UserData | null = null) => {
        setSelectedUser(user);
        setEditModalVisible(true);
    };

    const handleCloseEditModal = () => {
        setEditModalVisible(false);
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
            handleCloseEditModal();
            await loadUsers();
            Alert.alert("Éxito", `Usuario ${selectedUser ? 'actualizado' : 'creado'} correctamente.`);
        } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Ocurrió un error.");
        } finally {
            setSaving(false);
        }
    };

    // --- NUEVA FUNCIÓN CENTRAL PARA EJECUTAR LA ACCIÓN CONFIRMADA ---
    const handleConfirmAction = async () => {
        if (!actionToConfirm) return;

        const { type, user } = actionToConfirm;
        setConfirmModalVisible(false); // Oculta el modal inmediatamente
        setUpdatingUserId(user.uid);

        try {
            if (type === 'toggle') {
                const action = user.activo ? 'desactivar' : 'reactivar';
                const actionFn = user.activo ? desactivarUsuario : reactivarUsuario;
                await actionFn(user.uid);
                Alert.alert('Éxito', `Usuario ${action}do.`);
            } else if (type === 'delete') {
                await eliminarUsuarioComoAdmin(user.uid);
                Alert.alert("Éxito", "Usuario eliminado.");
            } else if (type === 'resetPassword') {
                await enviarEmailRecuperacion(user.email);
                Alert.alert('Email Enviado', `Se ha enviado un enlace de recuperación a ${user.email}.`);
            }
            await loadUsers(); // Recarga la lista después de cualquier acción exitosa
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
            Alert.alert("Error", message);
        } finally {
            setUpdatingUserId(null);
            setActionToConfirm(null);
        }
    };

    const requestActionConfirmation = (type: 'toggle' | 'delete' | 'resetPassword', user: UserData) => {
        setActionToConfirm({ type, user });
        setConfirmModalVisible(true);
    };

    const getConfirmationDetails = () => {
        if (!actionToConfirm) return { title: '', message: '', confirmButtonText: '', isDestructive: false };
        const { type, user } = actionToConfirm;
        switch (type) {
            case 'toggle':
                const action = user.activo ? 'desactivar' : 'reactivar';
                return { title: 'Confirmar', message: `¿Seguro que quieres ${action} a ${user.nombre}?`, confirmButtonText: 'Confirmar' };
            case 'delete':
                return { title: 'Confirmar Eliminación', message: `Vas a eliminar a ${user.nombre}. Esta acción no se puede deshacer.`, confirmButtonText: 'Eliminar', isDestructive: true };
            case 'resetPassword':
                return { title: 'Recuperar Contraseña', message: `¿Enviar un email de recuperación a ${user.email}?`, confirmButtonText: 'Enviar' };
            default:
                return { title: '', message: '' };
        }
    };

    // ... (Las funciones de CSV no cambian)
    const handleCsvUpload = async () => {
        setIsUploading(true);
        try {
            const pickerResult = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
            if (pickerResult.canceled) {
                setIsUploading(false);
                return;
            }
            const asset = pickerResult.assets[0];
            const fileText = await FileSystem.readAsStringAsync(asset.uri);
            setCsvContent(fileText);
            setCsvConfirmModalVisible(true);
        } catch (error) {
            Alert.alert("Error de Carga", error instanceof Error ? error.message : "No se pudo procesar el archivo.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmCsvUpload = async () => {
        setCsvConfirmModalVisible(false);
        setIsUploading(true);
        try {
            if (!csvContent) throw new Error("El contenido del CSV está vacío.");
            const result = await crearUsuariosDesdeCSV(csvContent);
            setCsvResult(result);
            setShowCsvResultModal(true);
            await loadUsers();
        } catch (serviceError) {
            const message = serviceError instanceof Error ? serviceError.message : "Ocurrió un error al procesar los datos.";
            Alert.alert("Error en Procesamiento", message);
        } finally {
            setIsUploading(false);
            setCsvContent('');
        }
    };

    const renderUser = ({ item }: { item: UserData }) => {
        const isUpdatingThisUser = updatingUserId === item.uid;
        const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

        return (
            <Card style={styles.userCard}>
                <View style={styles.userHeader}>
                    <Text style={styles.userName}>{item.nombre} {item.apellido}</Text>
                    <View style={[styles.statusIndicator, item.activo ? styles.activeStatus : styles.inactiveStatus]} />
                </View>
                <Text style={styles.userDetail}>RUT: {item.rut}</Text>
                <Text style={styles.userDetail}>Email: {item.email}</Text>

                <View style={styles.actionsContainer}>
                    {isUpdatingThisUser ? (
                        <ActivityIndicator size="small" color="#667eea" />
                    ) : (
                        <>
                            <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenEditModal(item)} hitSlop={hitSlop}>
                                <Ionicons name="pencil" size={22} color="#2B2B2B" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => requestActionConfirmation('toggle', item)} hitSlop={hitSlop}>
                                <Ionicons name={item.activo ? "eye-off" : "eye"} size={22} color={item.activo ? "#f59e0b" : "#10b981"} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => requestActionConfirmation('resetPassword', item)} hitSlop={hitSlop}>
                                <Ionicons name="key" size={22} color="#0ea5e9" />
                            </TouchableOpacity>

                            {currentUser?.role === 'admin' && (
                                <TouchableOpacity style={styles.actionButton} onPress={() => requestActionConfirmation('delete', item)} hitSlop={hitSlop}>
                                    <Ionicons name="trash" size={22} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </Card>
        );
    };

    if (loading) return <LoadingSpinner message="Cargando usuarios..." />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <EadLogo width={40}/>
                <Text style={styles.title}>Gestión de Usuarios</Text>
                <PucvLogo width={40} height={42}/>
            </View>
            <View style={styles.controlsContainer}>
                <TextInput style={styles.searchInput} placeholder="Buscar por nombre, RUT o email..." value={searchQuery} onChangeText={setSearchQuery} />
                <Button title="Añadir" onPress={() => handleOpenEditModal()} style={styles.addButton} textStyle={{fontSize: 14}}/>
                <Button title="Cargar CSV" onPress={handleCsvUpload} style={styles.csvButton} textStyle={{fontSize: 14}} loading={isUploading} disabled={isUploading} />
            </View>
            <FlatList
                data={filteredUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No se encontraron usuarios</Text></View>}
                keyboardShouldPersistTaps="handled"
            />
            <UserFormModal visible={editModalVisible} onClose={handleCloseEditModal} onSubmit={handleSaveUser} initialData={selectedUser} saving={saving} />

            <ConfirmationModal
                visible={confirmModalVisible}
                onClose={() => setConfirmModalVisible(false)}
                onConfirm={handleConfirmAction}
                {...getConfirmationDetails()}
            />

            <CSVResultModal visible={showCsvResultModal} onClose={() => setShowCsvResultModal(false)} result={csvResult} />

            <ConfirmationModal
                visible={isCsvConfirmModalVisible}
                onClose={() => setCsvConfirmModalVisible(false)}
                onConfirm={handleConfirmCsvUpload}
                title="Confirmar Carga"
                message="Estás a punto de procesar un archivo CSV. ¿Deseas continuar?"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2B2B2B',
        textAlign: 'center',
        paddingBottom: 1,
    },
    controlsContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db' },
    addButton: { paddingHorizontal: 12, backgroundColor: '#BE031E'},
    csvButton: { paddingHorizontal: 12, backgroundColor: '#BE031E'},
    listContainer: { paddingHorizontal: 16, paddingBottom: 16 },
    userCard: { marginBottom: 12 },
    userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    userDetail: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
    statusIndicator: { width: 12, height: 12, borderRadius: 6 },
    activeStatus: { backgroundColor: '#10b981' },
    inactiveStatus: { backgroundColor: '#ef4444' },
    actionsContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10, marginTop: 10, minHeight: 40 },
    actionButton: { padding: 8 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { fontSize: 16, color: '#6b7280' },
    modalCenteredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    confirmationModalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
    modalText: { marginBottom: 20, textAlign: 'center', fontSize: 16, lineHeight: 24 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    modalButton: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, elevation: 2, flex: 1, marginHorizontal: 8 },
    buttonCancel: { backgroundColor: '#6b7280' },
    buttonConfirm: { backgroundColor: '#10b981' },
    buttonDelete: { backgroundColor: '#ef4444' },
    buttonText: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
});
