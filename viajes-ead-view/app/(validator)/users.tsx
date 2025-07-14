import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TextInput,
    Alert,
    TouchableOpacity,
    Platform,
    Modal,
    Pressable,
    ActivityIndicator, ScrollView
} from 'react-native';
import {Card} from '@/components/ui/Card';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import {Button} from '@/components/ui/Button';
import {Ionicons} from '@expo/vector-icons';
import {useAuth, UserData} from '@/contexts/AuthContext';
import {UserFormModal} from '@/components/forms/UserFormModal';
import {CSVResultModal} from '@/components/modals/CSVResultModal';
import {
    obtenerEstudiantes,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    reactivarUsuario,
    enviarEmailRecuperacion,
    eliminarUsuarioComoAdmin,
    crearUsuariosDesdeCSV,
    eliminarUsuariosDesdeCSV, // Importar la nueva función
    getCsvUploadLimitStatus, // Importar la nueva función
    BatchResult,
    DeleteBatchResult // Importar el nuevo tipo
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

// --- NUEVO MODAL PARA RESULTADOS DE ELIMINACIÓN CSV ---
interface CSVDeleteResultModalProps {
    visible: boolean;
    onClose: () => void;
    result: DeleteBatchResult | null;
}

const CSVDeleteResultModal: React.FC<CSVDeleteResultModalProps> = ({ visible, onClose, result }) => {
    if (!result) return null;

    const renderErrorItem = ({ item }: { item: { row: number; message: string; email: string } }) => (
        <View style={styles.errorItem}>
            <Text style={styles.errorRow}>Fila {item.row}: {item.message}</Text>
            <Text style={styles.errorData}>
                Email: {item.email}
            </Text>
        </View>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalCenteredView}>
                <SafeAreaView style={styles.modalView}>
                    <Text style={styles.modalTitle}>Resultado de la Eliminación Masiva</Text>

                    <View style={styles.summaryContainer}>
                        <Card style={StyleSheet.flatten([styles.summaryCard, styles.successCard])}>
                            <Ionicons name="checkmark-circle" size={32} color="#15803d" />
                            <Text style={styles.summaryValue}>{result.successCount}</Text>
                            <Text style={styles.summaryLabel}>Usuarios Eliminados</Text>
                        </Card>
                        <Card style={StyleSheet.flatten([styles.summaryCard, styles.errorCard])}>
                            <Ionicons name="close-circle" size={32} color="#b91c1c" />
                            <Text style={styles.summaryValue}>{result.errorCount}</Text>
                            <Text style={styles.summaryLabel}>Filas con Error</Text>
                        </Card>
                    </View>

                    {result.errorCount > 0 && (
                        <>
                            <Text style={styles.errorListTitle}>Detalle de Errores:</Text>
                            <FlatList
                                data={result.errors}
                                renderItem={renderErrorItem}
                                keyExtractor={(item, index) => `delete-error-${index}`}
                                style={styles.errorList}
                            />
                        </>
                    )}

                    <Button
                        title="Cerrar"
                        onPress={onClose}
                        style={styles.closeButton}
                    />
                </SafeAreaView>
            </View>
        </Modal>
    );
};


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

    // Estado para el límite de carga CSV
    const [canUploadCsv, setCanUploadCsv] = useState(true);
    const [csvUploadLimitMessage, setCsvUploadLimitMessage] = useState('');

    const checkCsvUploadLimit = useCallback(async () => {
        console.log("Checking CSV upload limit status...");
        const { count, timeLeftMinutes } = await getCsvUploadLimitStatus();
        console.log(`CSV Upload Status: Count=${count}, TimeLeft=${timeLeftMinutes} minutes.`);
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
        console.log("Loading users...");
        try {
            const usersData = await obtenerEstudiantes();
            setUsers(usersData);
            setFilteredUsers(usersData);
            console.log("Users loaded successfully.");
        } catch (error) {
            console.error("Failed to load users:", error);
            Alert.alert('Error', 'No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
        checkCsvUploadLimit(); // Verificar el límite al cargar la pantalla
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
        console.log("Saving user:", userToSave.email);
        try {
            if (selectedUser) {
                await actualizarUsuario(selectedUser.uid, userToSave);
                console.log("User updated successfully.");
            } else {
                await crearUsuario(userToSave as Omit<UserData, 'uid' | 'activo' | 'fechaCreacion'>, password!);
                console.log("User created successfully.");
            }
            handleCloseEditModal();
            await loadUsers();
            Alert.alert("Éxito", `Usuario ${selectedUser ? 'actualizado' : 'creado'} correctamente.`);
            checkCsvUploadLimit(); // Re-verificar el límite después de crear un usuario
        } catch (error) {
            console.error("Error saving user:", error);
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
        console.log(`Confirming action '${type}' for user ${user.email}`);

        try {
            if (type === 'toggle') {
                const action = user.activo ? 'desactivar' : 'reactivar';
                const actionFn = user.activo ? desactivarUsuario : reactivarUsuario;
                await actionFn(user.uid);
                Alert.alert('Éxito', `Usuario ${action}do.`);
                console.log(`User ${user.email} ${action}d.`);
            } else if (type === 'delete') {
                await eliminarUsuarioComoAdmin(user.uid);
                Alert.alert("Éxito", "Usuario eliminado.");
                console.log(`User ${user.email} deleted.`);
            } else if (type === 'resetPassword') {
                await enviarEmailRecuperacion(user.email);
                Alert.alert('Email Enviado', `Se ha enviado un enlace de recuperación a ${user.email}.`);
                console.log(`Password reset email sent to ${user.email}.`);
            }
            await loadUsers(); // Recarga la lista después de cualquier acción exitosa
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
            console.error(`Error performing action '${type}' for user ${user.email}:`, error);
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

    // --- Funciones para Carga de CSV (Creación) ---
    const handleCsvUpload = async () => {
        if (!canUploadCsv) {
            console.log("CSV upload blocked: Limit reached. Message:", csvUploadLimitMessage);
            Alert.alert("Límite de Carga Alcanzado", csvUploadLimitMessage);
            return;
        }

        setIsUploading(true);
        console.log("Attempting to pick CSV document for creation...");
        try {
            const pickerResult = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: false }); // copyToCacheDirectory: false para web
            if (pickerResult.canceled) {
                console.log("Document picking cancelled for creation.");
                setIsUploading(false);
                return;
            }

            let fileText: string;
            if (Platform.OS === 'web') {
                // Para web, DocumentPicker.getDocumentAsync devuelve un objeto File en assets[0].file
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
                console.log("File content read using FileReader for web.");
            } else {
                // Para iOS/Android, FileSystem.readAsStringAsync usa el URI del asset
                const asset = pickerResult.assets[0];
                if (!asset || !asset.uri) throw new Error("No se pudo obtener el URI del archivo.");
                fileText = await FileSystem.readAsStringAsync(asset.uri);
                console.log("File content read using FileSystem.readAsStringAsync for native.");
            }

            setCsvContent(fileText);
            setCsvConfirmModalVisible(true);
        } catch (error) {
            console.error("Error during CSV upload process for creation:", error);
            Alert.alert("Error de Carga", error instanceof Error ? error.message : "No se pudo procesar el archivo.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmCsvUpload = async () => {
        setCsvConfirmModalVisible(false);
        setIsUploading(true);
        console.log("Confirming CSV upload for creation...");
        try {
            if (!csvContent) {
                console.error("CSV content is empty for creation.");
                throw new Error("El contenido del CSV está vacío.");
            }
            console.log("Calling crearUsuariosDesdeCSV...");
            const result = await crearUsuariosDesdeCSV(csvContent);
            console.log("crearUsuariosDesdeCSV completed. Result:", result);
            setCsvResult(result);
            setShowCsvResultModal(true);
            await loadUsers();
            checkCsvUploadLimit(); // Re-verificar el límite después de la carga CSV
        } catch (serviceError) {
            console.error("Error in CSV processing (crearUsuariosDesdeCSV):", serviceError);
            const message = serviceError instanceof Error ? serviceError.message : "Ocurrió un error al procesar los datos.";
            Alert.alert("Error en Procesamiento", message);
        } finally {
            setIsUploading(false);
            setCsvContent('');
        }
    };

    // --- Nuevas funciones para Eliminación de CSV ---
    const handleCsvDeleteUpload = async () => {
        setIsDeletingCsv(true);
        console.log("Attempting to pick CSV document for deletion...");
        try {
            const pickerResult = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: false }); // copyToCacheDirectory: false para web
            if (pickerResult.canceled) {
                console.log("Document picking cancelled for deletion.");
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
                console.log("File content read using FileReader for web (deletion).");
            } else {
                const asset = pickerResult.assets[0];
                if (!asset || !asset.uri) throw new Error("No se pudo obtener el URI del archivo para eliminación.");
                fileText = await FileSystem.readAsStringAsync(asset.uri);
                console.log("File content read using FileSystem.readAsStringAsync for native (deletion).");
            }

            setCsvDeleteContent(fileText);
            setCsvDeleteConfirmModalVisible(true);
        } catch (error) {
            console.error("Error during CSV upload process for deletion:", error);
            Alert.alert("Error de Carga", error instanceof Error ? error.message : "No se pudo procesar el archivo.");
        } finally {
            setIsDeletingCsv(false);
        }
    };

    const handleConfirmCsvDelete = async () => {
        setCsvDeleteConfirmModalVisible(false);
        setIsDeletingCsv(true);
        console.log("Confirming CSV upload for deletion...");
        try {
            if (!csvDeleteContent) {
                console.error("CSV content is empty for deletion.");
                throw new Error("El contenido del CSV está vacío.");
            }
            console.log("Calling eliminarUsuariosDesdeCSV...");
            const result = await eliminarUsuariosDesdeCSV(csvDeleteContent);
            console.log("eliminarUsuariosDesdeCSV completed. Result:", result);
            setCsvDeleteResult(result);
            setShowCsvDeleteResultModal(true);
            await loadUsers(); // Recargar usuarios después de la eliminación
        } catch (serviceError) {
            console.error("Error in CSV processing (eliminarUsuariosDesdeCSV):", serviceError);
            const message = serviceError instanceof Error ? serviceError.message : "Ocurrió un error al procesar los datos para eliminación.";
            Alert.alert("Error en Procesamiento", message);
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
                <Button title="Añadir" onPress={() => handleOpenEditModal()} style={styles.addButton} textStyle={{ fontSize: 14 }} />
            </View>

            <ScrollView>
                {/* Sección de Carga CSV */}
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

                {/* Sección de Eliminación CSV */}
                {currentUser?.role === 'admin' && ( // Solo admins pueden eliminar masivamente
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

            <CSVResultModal visible={showCsvResultModal} onClose={() => { setShowCsvResultModal(false); checkCsvUploadLimit(); }} result={csvResult} />

            <ConfirmationModal
                visible={isCsvConfirmModalVisible}
                onClose={() => setCsvConfirmModalVisible(false)}
                onConfirm={handleConfirmCsvUpload}
                title="Confirmar Carga"
                message="Estás a punto de procesar un archivo CSV para crear usuarios. ¿Deseas continuar?"
            />

            {/* Modal para resultados de eliminación CSV */}
            <CSVDeleteResultModal visible={showCsvDeleteResultModal} onClose={() => setShowCsvDeleteResultModal(false)} result={csvDeleteResult} />

            {/* Modal de confirmación para eliminación CSV */}
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
    controlsContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8, marginBottom: 10 },
    searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db' },
    addButton: { paddingHorizontal: 12, backgroundColor: '#BE031E'},
    csvButton: { paddingHorizontal: 12, backgroundColor: '#BE031E'},
    listContainer: { paddingHorizontal: 16, paddingBottom: 16 },
    userCard: { marginBottom: 12, backgroundColor: '#f3f4f6' },
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
    // Estilos para los nuevos elementos CSV
    csvSectionContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
    },
    csvSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 10,
    },
    disabledButton: {
        backgroundColor: '#9ca3af', // Color gris para botón deshabilitado
    },
    limitWarningText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 5,
        textAlign: 'center',
    },
    deleteCsvButton: {
        backgroundColor: '#dc2626', // Color rojo para el botón de eliminar
    },
    deleteCsvHintText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 5,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    // Estilos del modal de resultados CSV (duplicados para el nuevo modal de eliminación)
    // Asegúrate de que estos estilos sean consistentes o refactorizados si son idénticos
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 8,
        borderWidth: 1,
    },
    successCard: {
        backgroundColor: '#f0fdf4',
        borderColor: '#86efac',
    },
    errorCard: {
        backgroundColor: '#fef2f2',
        borderColor: '#fca5a5',
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 8,
        color: '#1f2937',
    },
    summaryLabel: {
        fontSize: 14,
        color: '#4b5563',
        marginTop: 4,
    },
    errorListTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 10,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 16,
    },
    errorList: {
        flex: 1,
        width: '100%',
    },
    errorItem: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
    },
    errorRow: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#b91c1c',
    },
    errorData: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    closeButton: {
        marginTop: 20,
        backgroundColor: '#667eea',
    },
    modalView: { // Asegúrate de que este estilo también esté disponible para el nuevo modal
        height: '85%',
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
});

