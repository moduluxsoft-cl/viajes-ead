// src/components/forms/UserFormModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, Switch, Alert, ScrollView } from 'react-native';
import { Button } from '../ui/Button';
import { Picker } from '@react-native-picker/picker';
import { UserData } from '../../contexts/AuthContext';
import { getPropertyValues } from '../../src/services/configuracionService';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (user: Partial<UserData>, password?: string) => void;
    initialData?: UserData | null;
    saving: boolean;
}

export const UserFormModal = ({ visible, onClose, onSubmit, initialData, saving }: Props) => {
    const getInitialState = (): Partial<UserData> => ({
        nombre: initialData?.nombre || '',
        apellido: initialData?.apellido || '',
        email: initialData?.email || '',
        rut: initialData?.rut || '',
        carrera: initialData?.carrera || '',
        activo: initialData ? initialData.activo : true,

        role: 'student',
    });

    const [user, setUser] = useState<Partial<UserData>>(getInitialState);
    const [password, setPassword] = useState('');
    const [carreras, setCarreras] = useState<string[]>([]);

    // Cargar la lista de carreras desde Firestore
    useEffect(() => {
        if (visible) {
            getPropertyValues("CARRERA")
                .then(setCarreras)
                .catch(() => Alert.alert("Error", "No se pudo cargar la lista de carreras."));
        }
    }, [visible]);

    // Actualizar el formulario si los datos iniciales cambian
    useEffect(() => {
        if (visible) {
            setUser(getInitialState());
            setPassword('');
        }
    }, [initialData, visible]);

    const handleSubmit = () => {
        if (!user.nombre || !user.apellido || !user.email || !user.rut) {
            Alert.alert("Campos requeridos", "Por favor, completa nombre, apellido, email y RUT.");
            return;
        }
        if (!initialData && (!password || password.length < 6)) {
            Alert.alert("Contraseña inválida", "La contraseña es obligatoria y debe tener al menos 6 caracteres.");
            return;
        }
        onSubmit(user, password);
    };

    const formatRUT = (rut: string) => {
        // Elimina puntos, guion y caracteres no numéricos
        const cleanRut = rut.replace(/[^\dkK]/g, '');

        // Si el RUT no tiene más de 9 caracteres
        if (cleanRut.length <= 9) {
            const body = cleanRut.slice(0, -1); // Parte numérica sin el último dígito
            const dv = cleanRut.slice(-1);

            // Agrega puntos a la parte numérica
            const formattedBody = body
                .replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // Añade puntos cada 3 dígitos

            // Si tiene al menos 2 dígitos, agrega el guion
            return cleanRut.length > 1 ? (`${formattedBody}-${dv}`) : (dv);
        }

        return cleanRut;
    };

    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <ScrollView>
                        <Text style={styles.title}>{initialData ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</Text>

                        <Text style={styles.label}>Nombre</Text>
                        <TextInput style={styles.input} value={user.nombre} onChangeText={t => setUser(u => ({ ...u, nombre: t }))} />

                        <Text style={styles.label}>Apellido</Text>
                        <TextInput style={styles.input} value={user.apellido} onChangeText={t => setUser(u => ({ ...u, apellido: t }))} />

                        <Text style={styles.label}>Email</Text>
                        <TextInput style={styles.input} value={user.email} onChangeText={t => setUser(u => ({ ...u, email: t }))} keyboardType="email-address" autoCapitalize="none" editable={!initialData} />

                        {!initialData && (
                            <>
                                <Text style={styles.label}>Contraseña (mín. 6 caracteres)</Text>
                                <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
                            </>
                        )}

                        <Text style={styles.label}>RUT</Text>
                        <TextInput
                            style={styles.input}
                            value={user.rut}
                            onChangeText={t => setUser(u => ({ ...u, rut: formatRUT(t) }))}
                            maxLength={12}
                        />

                        <Text style={styles.label}>Carrera</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={user.carrera} onValueChange={v => setUser(u => ({ ...u, carrera: v }))}>
                                <Picker.Item label="Seleccionar carrera..." value="" />
                                {carreras.map(c => <Picker.Item key={c} label={c} value={c} />)}
                            </Picker>
                        </View>

                        <View style={styles.switchContainer}>
                            <Text style={styles.label}>Usuario Activo</Text>
                            <Switch value={!!user.activo} onValueChange={v => setUser(u => ({ ...u, activo: v }))} />
                        </View>

                        <View style={styles.buttonContainer}>
                            <Button title="Cancelar" onPress={onClose} variant="secondary" style={{ marginRight: 10 }} />
                            <Button title={saving ? "Guardando..." : "Guardar"} onPress={handleSubmit} loading={saving} />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 10, padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
    label: { fontSize: 16, marginBottom: 5, fontWeight: '600' },
    pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15 },
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }
});
