import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, Switch, Alert, ScrollView } from 'react-native';
import { Button } from '../ui/Button';
import { Picker } from '@react-native-picker/picker';
import {useAuth, UserData} from '@/contexts/AuthContext';
import { getPropertyValues } from '@/src/services/configuracionService';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (user: Partial<UserData>, password?: string) => void;
    initialData?: UserData | null;
    saving: boolean;
}

interface ValidationErrors {
    nombre?: string;
    apellido?: string;
    email?: string;
    rut?: string;
    password?: string;
    carrera?: string;
}

export const UserFormModal = ({ visible, onClose, onSubmit, initialData, saving }: Props) => {
    const { userData: currentUser } = useAuth();
    const getInitialState = (): Partial<UserData> => ({
        nombre: initialData?.nombre || '',
        apellido: initialData?.apellido || '',
        email: initialData?.email || '',
        rut: initialData?.rut || '',
        carrera: initialData?.carrera || '',
        activo: initialData ? initialData.activo : true,
        role: initialData?.role || 'student',
    });

    const [user, setUser] = useState<Partial<UserData>>(getInitialState);
    const [password, setPassword] = useState('');
    const [carreras, setCarreras] = useState<string[]>([]);
    const [errors, setErrors] = useState<ValidationErrors>({});

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
            setErrors({});
        }
    }, [initialData, visible]);

    // Validaciones
    const validateField = (field: string, value: string) => {
        const newErrors = { ...errors };

        switch (field) {
            case 'nombre':
                if (!value.trim()) {
                    newErrors.nombre = 'El nombre es requerido';
                } else if (value.length < 2) {
                    newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
                } else {
                    delete newErrors.nombre;
                }
                break;

            case 'apellido':
                if (!value.trim()) {
                    newErrors.apellido = 'El apellido es requerido';
                } else if (value.length < 2) {
                    newErrors.apellido = 'El apellido debe tener al menos 2 caracteres';
                } else {
                    delete newErrors.apellido;
                }
                break;

            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value.trim()) {
                    newErrors.email = 'El email es requerido';
                } else if (!emailRegex.test(value)) {
                    newErrors.email = 'Formato de email inválido';
                } else {
                    delete newErrors.email;
                }
                break;

            case 'rut':
                if (!value.trim()) {
                    newErrors.rut = 'El RUT es requerido';
                } else if (!validateRUT(value)) {
                    newErrors.rut = 'RUT inválido';
                } else {
                    delete newErrors.rut;
                }
                break;

            case 'password':
                if (!initialData) {
                    if (!value) {
                        newErrors.password = 'La contraseña es requerida';
                    } else if (value.length < 6) {
                        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
                    } else {
                        delete newErrors.password;
                    }
                }
                break;

            case 'carrera':
                if (!value) {
                    newErrors.carrera = 'Debe seleccionar una carrera';
                } else {
                    delete newErrors.carrera;
                }
                break;
        }

        setErrors(newErrors);
    };

    const validateRUT = (rut: string): boolean => {
        const cleanRut = rut.replace(/[^\dkK]/g, '');
        if (cleanRut.length < 2) return false;

        const body = cleanRut.slice(0, -1);
        const dv = cleanRut.slice(-1).toUpperCase();

        let sum = 0;
        let multiplier = 2;

        for (let i = body.length - 1; i >= 0; i--) {
            sum += parseInt(body[i]) * multiplier;
            multiplier = multiplier === 7 ? 2 : multiplier + 1;
        }

        const remainder = sum % 11;
        const calculatedDv = remainder < 2 ? remainder.toString() : remainder === 10 ? 'K' : (11 - remainder).toString();

        return dv === calculatedDv;
    };

    const validateAllFields = (): boolean => {
        const fieldsToValidate = ['nombre', 'apellido', 'email', 'rut', 'carrera'];
        if (!initialData) fieldsToValidate.push('password');

        fieldsToValidate.forEach(field => {
            const value = field === 'password' ? password : user[field as keyof UserData] as string;
            validateField(field, value || '');
        });

        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateAllFields()) {
            Alert.alert("Errores en el formulario", "Por favor, corrige los errores antes de continuar.");
            return;
        }
        onSubmit(user, password);
    };

    const formatRUT = (rut: string) => {
        const cleanRut = rut.replace(/[^\dkK]/g, '');
        if (cleanRut.length <= 9) {
            const body = cleanRut.slice(0, -1);
            const dv = cleanRut.slice(-1);
            const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return cleanRut.length > 1 ? `${formattedBody}-${dv}` : dv;
        }
        return cleanRut;
    };

    const handleUserChange = (field: string, value: string) => {
        setUser(u => ({ ...u, [field]: value }));
        if (typeof value === 'string' && ['nombre', 'apellido', 'email', 'rut', 'carrera'].includes(field)) {
            validateField(field, value);
        }    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        validateField('password', value);
    };

    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <ScrollView style={styles.modalInnerContent}>
                        <Text style={styles.title}>{initialData ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</Text>

                        <Text style={styles.label}>Nombre</Text>
                        <TextInput
                            style={[styles.input, errors.nombre ? styles.inputError : null]}
                            value={user.nombre}
                            onChangeText={t => handleUserChange('nombre', t)}
                            onBlur={() => validateField('nombre', user.nombre || '')}
                        />
                        {errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}

                        <Text style={styles.label}>Apellido</Text>
                        <TextInput
                            style={[styles.input, errors.apellido ? styles.inputError : null]}
                            value={user.apellido}
                            onChangeText={t => handleUserChange('apellido', t)}
                            onBlur={() => validateField('apellido', user.apellido || '')}
                        />
                        {errors.apellido && <Text style={styles.errorText}>{errors.apellido}</Text>}

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, errors.email ? styles.inputError : null]}
                            value={user.email}
                            onChangeText={t => handleUserChange('email', t)}
                            onBlur={() => validateField('email', user.email || '')}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!initialData}
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                        {!initialData && (
                            <>
                                <Text style={styles.label}>Contraseña (mín. 6 caracteres)</Text>
                                <TextInput
                                    style={[styles.input, errors.password ? styles.inputError : null]}
                                    value={password}
                                    onChangeText={handlePasswordChange}
                                    onBlur={() => validateField('password', password)}
                                    secureTextEntry
                                />
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            </>
                        )}

                        <Text style={styles.label}>RUT</Text>
                        <TextInput
                            style={[styles.input, errors.rut ? styles.inputError : null]}
                            value={user.rut}
                            onChangeText={t => handleUserChange('rut', formatRUT(t))}
                            onBlur={() => validateField('rut', user.rut || '')}
                            maxLength={12}
                        />
                        {errors.rut && <Text style={styles.errorText}>{errors.rut}</Text>}

                        <Text style={styles.label}>Carrera</Text>
                        <View style={[styles.pickerContainer, errors.carrera ? styles.inputError : null]}>
                            <Picker
                                selectedValue={user.carrera}
                                onValueChange={v => handleUserChange('carrera', v)}
                            >
                                <Picker.Item label="Seleccionar carrera..." value="" />
                                {carreras.map(c => <Picker.Item key={c} label={c} value={c} />)}
                            </Picker>
                        </View>
                        {errors.carrera && <Text style={styles.errorText}>{errors.carrera}</Text>}
                        {currentUser?.role === 'admin' && (
                            <>
                                <Text style={styles.label}>Rol de Usuario</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={user.role}
                                        onValueChange={(itemValue) => handleUserChange('role', itemValue)}
                                    >
                                        <Picker.Item label="Estudiante" value="student" />
                                        <Picker.Item label="Validador" value="validator" />
                                    </Picker>
                                </View>
                            </>
                        )}
                        <View style={styles.switchContainer}>
                            <Text style={styles.label}>Usuario Activo</Text>
                            <Switch value={!!user.activo} onValueChange={v => setUser(u => ({ ...u, activo: v }))} />
                        </View>

                        <View style={styles.buttonContainer}>
                            <Button title="Cancelar" onPress={onClose} variant="secondary" style={{ marginRight: 10, borderColor: '#BE031E' }} textStyle={{color: '#BE031E'}}/>
                            <Button title={saving ? "Guardando..." : "Guardar"} onPress={handleSubmit} loading={saving} disabled={Object.keys(errors).length !== 0} style={{backgroundColor: '#BE031E'}}/>
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
    modalInnerContent: { paddingLeft: 5, paddingRight: 5 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
    inputError: { borderColor: '#ff0000' },
    label: { fontSize: 16, marginBottom: 5, fontWeight: '600' },
    pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15 },
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    errorText: { color: '#ff0000', fontSize: 12, marginBottom: 10, marginTop: -10 }
});