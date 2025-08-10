import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {Card} from '@/components/ui/Card';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import {Button} from '@/components/ui/Button';
import {IoCheckmarkCircle, IoCloseCircle, IoEye, IoEyeOff, IoKey, IoPencil, IoTrash} from "react-icons/io5";
import {useAuth, UserData} from '@/contexts/AuthContext';
import {UserFormModal} from '@/components/forms/UserFormModal';
// Importamos el modal genérico que acabamos de modificar
import {CSVResultModal} from '@/components/modals/CSVResultModal';
import {
    actualizarUsuario,
    BatchResult,
    crearUsuario,
    crearUsuariosDesdeCSV,
    DeleteBatchResult,
    desactivarUsuario,
    eliminarUsuarioComoAdmin,
    eliminarUsuariosDesdeCSV,
    enviarEmailRecuperacion,
    getCsvUploadLimitStatus,
    obtenerUsuariosGestionables,
    reactivarUsuario
} from '@/src/services/usersService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {EadLogo} from "@/assets/icons/ead-logo";
import PucvLogo from "@/assets/icons/pucv-logo";
import {Id, toast} from "react-toastify";

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

    if (currentUser?.role !== 'admin') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Text style={styles.errorText}>No tienes permiso para acceder a esta sección.</Text>
                </View>
            </SafeAreaView>
        );
    }
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

    // Nuevos estados para la eliminación por CSV
    const [isDeletingCsv, setIsDeletingCsv] = useState(false);
    const [csvDeleteResult, setCsvDeleteResult] = useState<DeleteBatchResult | null>(null);
    const [showCsvDeleteResultModal, setShowCsvDeleteResultModal] = useState(false);
    const [csvDeleteContent, setCsvDeleteContent] = useState<string>('');
    const [isCsvDeleteConfirmModalVisible, setCsvDeleteConfirmModalVisible] = useState(false);


    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // --- ESTADOS PARA EL NUEVO MODAL DE CONFIRMACIÓN ---
    const [actionToConfirm, setActionToConfirm] = useState<ActionToConfirm>(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [isLoadingAction, setIsLoadingAction] = useState(false);
    const [processingUser, setProcessingUser] = useState<UserData | null>(null);

    // Estado para el límite de carga CSV
    const [canUploadCsv, setCanUploadCsv] = useState(true);
    const [csvUploadLimitMessage, setCsvUploadLimitMessage] = useState('');

    const toastId = useRef<Id | null>(null);

    useEffect(() => {
        if (isLoadingAction) {
            if (!toastId.current) {
                toastId.current = toast.loading(
                    `Procesando acción para usuario ${processingUser?.nombre} ${processingUser?.apellido}, RUT: ${processingUser?.rut} ...`
                );
            }
        } else {
            if (toastId.current) {
                toast.dismiss(toastId.current);
                toastId.current = null;
            }
        }
    }, [isLoadingAction, processingUser]);


    const checkCsvUploadLimit = useCallback(async () => {
        const { count, timeLeftMinutes } = await getCsvUploadLimitStatus();
        if (count >= 100) {
            setCanUploadCsv(false);
            setCsvUploadLimitMessage(
                `Has alcanzado el límite de 100 usuarios por hora. ` +
                `Intenta de nuevo en aproximadamente ${timeLeftMinutes} minutos.`
            );
        } else {
            setCanUploadCsv(true);
            setCsvUploadLimitMessage('');
        }
    }, []);


    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const usersData = await obtenerUsuariosGestionables();
            setUsers(usersData);
            setFilteredUsers(usersData);
        } catch (error) {
            toast.error('Error: No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
        checkCsvUploadLimit();
    }, [loadUsers, checkCsvUploadLimit]);

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
            toast.success(`Éxito: Usuario ${selectedUser ? 'actualizado' : 'creado'} correctamente.`);
            checkCsvUploadLimit();
        } catch (error) {
            toast.error(`Error: ${error instanceof Error ? error.message : "Ocurrió un error."}`);
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmAction = async  () => {
        if (!actionToConfirm) return;

        const { type, user } = actionToConfirm;
        setConfirmModalVisible(false);
        setUpdatingUserId(user.uid);
        setIsLoadingAction(true);
        setProcessingUser(user);

        try {
            if (type === 'toggle') {
                const action = user.activo ? 'desactiva' : 'reactiva';
                const actionFn = user.activo ? desactivarUsuario : reactivarUsuario;
                await actionFn(user.uid).then(async () => {
                    setIsLoadingAction(false);
                    await loadUsers();
                    toast.success(`Éxito: usuario ${user.nombre} ${user.apellido}, RUT: ${user.rut}, ${action}do.`);
                }).catch(()=> {
                    setIsLoadingAction(false);
                    toast.error(`Error: No se logró ${action}r el usuario ${user.nombre} ${user.apellido}, RUT: ${user.rut}.`);
                });
            } else if (type === 'delete') {
                await eliminarUsuarioComoAdmin(user.uid).then(async ()=> {
                    setIsLoadingAction(false);
                    await loadUsers();
                    toast.success(`Éxito: usuario ${user.nombre} ${user.apellido}, RUT: ${user.rut}, eliminado.`);
                }).catch(()=>{
                    setIsLoadingAction(false);
                    toast.error(`Error: No se logró eliminar el usuario ${user.nombre} ${user.apellido}, RUT: ${user.rut}.`);
                });
            } else if (type === 'resetPassword') {
                await enviarEmailRecuperacion(user.email).then(async ()=> {
                    setIsLoadingAction(false);
                    await loadUsers();
                    toast.success(`Éxito: se ha enviado un enlace de recuperación a ${user.email}.`);
                }).catch(()=>{
                    setIsLoadingAction(false);
                    toast.error(`Error: No se logró enviar el correo a ${user.email}.`);
                });
            }
        } catch (error: Error | any) {
            setIsLoadingAction(false);
            toast.error(`Error inesperado: ${error.message}.`);
        } finally {
            setUpdatingUserId(null);
            setActionToConfirm(null);
            setProcessingUser(null);
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

    // --- Funciones para Carga de CSV (Creación) ---
    const handleCsvUpload = async () => {
        if (!canUploadCsv) {
            toast.info("Límite de Carga Alcanzado" + csvUploadLimitMessage);
            return;
        }

        setIsUploading(true);
        try {
            const pickerResult = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: false });
            if (pickerResult.canceled) {
                setIsUploading(false);
                return;
            }

            let fileText: string;
            if (Platform.OS === 'web') {
                const file = pickerResult.assets[0].file;
                if (!file) throw new Error("No se pudo obtener el archivo del picker en web.");

                fileText = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (e.target && typeof e.target.result === 'string') {
                            resolve(e.target.result);
                        } else {
                            reject(new Error("No se pudo leer el archivo como texto."));
                        }
                    };
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            } else {
                const asset = pickerResult.assets[0];
                if (!asset || !asset.uri) throw new Error("No se pudo obtener el URI del archivo.");
                fileText = await FileSystem.readAsStringAsync(asset.uri);
            }

            setCsvContent(fileText);
            setCsvConfirmModalVisible(true);
        } catch (error) {
            toast.error(`Error de Carga ${error instanceof Error ? error.message : "No se pudo procesar el archivo."}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmCsvUpload = async () => {
        setCsvConfirmModalVisible(false);
        setIsUploading(true);
        try {
            if (!csvContent) {
                throw new Error("El contenido del CSV está vacío.");
            }
            const result = await crearUsuariosDesdeCSV(csvContent);
            setCsvResult(result);
            setShowCsvResultModal(true);
            await loadUsers();
            checkCsvUploadLimit();
        } catch (serviceError) {
            const message = serviceError instanceof Error ? serviceError.message : "Ocurrió un error al procesar los datos.";
            toast.error("Error en Procesamiento" + message);
        } finally {
            setIsUploading(false);
            setCsvContent('');
        }
    };

    const handleCsvDeleteUpload = async () => {
        setIsDeletingCsv(true);
        try {
            const pickerResult = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: false });
            if (pickerResult.canceled) {
                setIsDeletingCsv(false);
                return;
            }

            let fileText: string;
            if (Platform.OS === 'web') {
                const file = pickerResult.assets[0].file;
                if (!file) throw new Error("No se pudo obtener el archivo del picker en web para eliminación.");

                fileText = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (e.target && typeof e.target.result === 'string') {
                            resolve(e.target.result);
                        } else {
                            reject(new Error("No se pudo leer el archivo como texto para eliminación."));
                        }
                    };
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            } else {
                const asset = pickerResult.assets[0];
                if (!asset || !asset.uri) throw new Error("No se pudo obtener el URI del archivo para eliminación.");
                fileText = await FileSystem.readAsStringAsync(asset.uri);
            }

            setCsvDeleteContent(fileText);
            setCsvDeleteConfirmModalVisible(true);
        } catch (error) {
            toast.error(`Error de Carga ${error instanceof Error ? error.message : "No se pudo procesar el archivo."}`);
        } finally {
            setIsDeletingCsv(false);
        }
    };

    const handleConfirmCsvDelete = async () => {
        setCsvDeleteConfirmModalVisible(false);
        setIsDeletingCsv(true);
        try {
            if (!csvDeleteContent) {
                throw new Error("El contenido del CSV está vacío.");
            }
            const result = await eliminarUsuariosDesdeCSV(csvDeleteContent);
            setCsvDeleteResult(result);
            setShowCsvDeleteResultModal(true);
            await loadUsers();
        } catch (serviceError) {
            const message = serviceError instanceof Error ? serviceError.message : "Ocurrió un error al procesar los datos para eliminación.";
            toast.error("Error en Procesamiento" + message);
        } finally {
            setIsDeletingCsv(false);
            setCsvDeleteContent('');
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
                                <IoPencil size={22} color="#2B2B2B" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => requestActionConfirmation('toggle', item)} hitSlop={hitSlop}>
                                {item.activo ? <IoEyeOff size={22} color="#f59e0b" /> : <IoEye size={22} color="#10b981" />}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => requestActionConfirmation('resetPassword', item)} hitSlop={hitSlop}>
                                <IoKey size={22} color="#0ea5e9" />
                            </TouchableOpacity>

                            {currentUser?.role === 'admin' && (
                                <TouchableOpacity style={styles.actionButton} onPress={() => requestActionConfirmation('delete', item)} hitSlop={hitSlop}>
                                    <IoTrash size={22} color="#ef4444" />
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
                <Button title="Añadir" onPress={() => handleOpenEditModal()} style={styles.addButton} textStyle={{ fontSize: 14 }} />
            </View>
            <ScrollView>
                <View style={styles.csvSectionContainer}>
                    <Text style={styles.csvSectionTitle}>Carga Masiva de Usuarios</Text>
                    <Button
                        title="Cargar CSV (Crear)"
                        onPress={handleCsvUpload}
                        style={[styles.csvButton, !canUploadCsv && styles.disabledButton]}
                        textStyle={{ fontSize: 14 }}
                        loading={isUploading}
                        disabled={isUploading || !canUploadCsv}
                    />
                    {!canUploadCsv && <Text style={styles.limitWarningText}>{csvUploadLimitMessage}</Text>}
                </View>

                {currentUser?.role === 'admin' && (
                    <View style={styles.csvSectionContainer}>
                        <Text style={styles.csvSectionTitle}>Eliminación Masiva de Usuarios</Text>
                        <Button
                            title="Cargar CSV (Eliminar)"
                            onPress={handleCsvDeleteUpload}
                            style={[styles.csvButton, styles.deleteCsvButton]}
                            textStyle={{ fontSize: 14 }}
                            loading={isDeletingCsv}
                            disabled={isDeletingCsv}
                        />
                        <Text style={styles.deleteCsvHintText}>
                            El CSV para eliminar debe contener solo una columna 'email'.
                        </Text>
                    </View>
                )}


                <FlatList
                    data={filteredUsers}
                    renderItem={renderUser}
                    keyExtractor={(item) => item.uid}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No se encontraron usuarios</Text></View>}
                    keyboardShouldPersistTaps="handled"
                />
            </ScrollView>

            <UserFormModal visible={editModalVisible} onClose={handleCloseEditModal} onSubmit={handleSaveUser} initialData={selectedUser} saving={saving} />

            <ConfirmationModal
                visible={confirmModalVisible}
                onClose={() => setConfirmModalVisible(false)}
                onConfirm={handleConfirmAction}
                {...getConfirmationDetails()}
            />

            {/* --- MODALES DE RESULTADO ACTUALIZADOS --- */}

            {/* Modal para resultados de CREACIÓN por CSV */}
            <CSVResultModal
                visible={showCsvResultModal}
                onClose={() => { setShowCsvResultModal(false); checkCsvUploadLimit(); }}
                result={csvResult}
                modalTitle="Resultado de la Carga"
                successLabel="Usuarios Creados"
            />

            {/* Modal para resultados de ELIMINACIÓN por CSV */}
            <CSVResultModal
                visible={showCsvDeleteResultModal}
                onClose={() => setShowCsvDeleteResultModal(false)}
                result={csvDeleteResult}
                modalTitle="Resultado de la Eliminación Masiva"
                successLabel="Usuarios Eliminados"
            />

            {/* --- MODALES DE CONFIRMACIÓN (SIN CAMBIOS) --- */}
            <ConfirmationModal
                visible={isCsvConfirmModalVisible}
                onClose={() => setCsvConfirmModalVisible(false)}
                onConfirm={handleConfirmCsvUpload}
                title="Confirmar Carga"
                message="Estás a punto de procesar un archivo CSV para crear usuarios. ¿Deseas continuar?"
            />

            <ConfirmationModal
                visible={isCsvDeleteConfirmModalVisible}
                onClose={() => setCsvDeleteConfirmModalVisible(false)}
                onConfirm={handleConfirmCsvDelete}
                title="Confirmar Eliminación Masiva"
                message="Estás a punto de procesar un archivo CSV para ELIMINAR usuarios. Esta acción es irreversible. ¿Deseas continuar?"
                confirmButtonText="Eliminar Usuarios"
                isDestructive={true}
            />
        </SafeAreaView>
    );
}

// --- ESTILOS (SIN CAMBIOS) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EAEAEA' },
    header: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2B2B2B',
        textAlign: 'center',
        paddingBottom: 1,
    },
    controlsContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, marginBottom: 10, backgroundColor: '#FFFFFF' },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db' },
    addButton: { paddingHorizontal: 12, backgroundColor: '#BE031E'},
    csvButton: { paddingHorizontal: 12, backgroundColor: '#BE031E'},
    listContainer: { paddingHorizontal: 16, paddingBottom: 16 },
    userCard: { marginBottom: 12, backgroundColor: '#ffffff' },
    userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    userRoleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4f46e5',
        marginBottom: 6,
        fontStyle: 'italic',
    },
    errorText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 18,
        color: '#ef4444'
    },
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
    csvSectionContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '##f3f4f6',
        marginBottom: 8,
    },
    csvSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 10,
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    limitWarningText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 5,
        textAlign: 'center',
    },
    deleteCsvButton: {
        backgroundColor: '#dc2626',
    },
    deleteCsvHintText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 5,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
