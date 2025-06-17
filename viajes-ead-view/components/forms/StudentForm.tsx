import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface StudentFormData {
    nombre: string;
    apellido: string;
    rut: string;
    carrera: string;
    fechaViaje: string;
}

interface StudentFormProps {
    onSubmit: (data: StudentFormData) => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ onSubmit }) => {
    const [formData, setFormData] = useState<StudentFormData>({
        nombre: '',
        apellido: '',
        rut: '',
        carrera: '',
        fechaViaje: '',
    });

    const handleSubmit = () => {
        // Aquí iría la validación
        onSubmit(formData);
    };

    return (
        <View style={styles.container}>
            <Input
                label="Nombre"
                placeholder="Ingresa tu nombre"
                value={formData.nombre}
                onChangeText={(text) => setFormData({ ...formData, nombre: text })}
            />
            <Input
                label="Apellido"
                placeholder="Ingresa tu apellido"
                value={formData.apellido}
                onChangeText={(text) => setFormData({ ...formData, apellido: text })}
            />
            <Input
                label="RUT"
                placeholder="12.345.678-9"
                value={formData.rut}
                onChangeText={(text) => setFormData({ ...formData, rut: text })}
            />
            <Input
                label="Carrera"
                placeholder="Ej: Ingeniería Civil"
                value={formData.carrera}
                onChangeText={(text) => setFormData({ ...formData, carrera: text })}
            />
            <Input
                label="Fecha de Viaje"
                placeholder="DD/MM/AAAA"
                value={formData.fechaViaje}
                onChangeText={(text) => setFormData({ ...formData, fechaViaje: text })}
            />
            <Button title="Generar QR" onPress={handleSubmit} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
});
