import React, { useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerInputProps {
    value: Date | undefined;
    onChange: (date: Date) => void;
}

const formatDateToString = (date: Date): string => {
    return date.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export function DatePickerInput({ value, onChange }: DatePickerInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handlePress = () => {
        // Al presionar el botón visible, activamos el input invisible
        inputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            // El input de HTML devuelve la fecha en formato YYYY-MM-DD (UTC)
            // Lo convertimos a un objeto Date en la zona horaria local
            const [year, month, day] = e.target.value.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            date.setHours(8, 0, 0, 0); // Mantenemos la consistencia de la hora
            onChange(date);
        }
    };

    return (
        // Usamos un TouchableOpacity para que el usuario pueda presionar el botón
        <TouchableOpacity onPress={handlePress} style={styles.datePickerButton}>
            <Ionicons name="calendar" size={20} color="#374151" />
            <Text style={styles.datePickerButtonText}>
                {value ? formatDateToString(value) : 'Seleccionar fecha'}
            </Text>
            {/* El input real está oculto y se usa solo para abrir el selector del navegador */}
            <input
                ref={inputRef}
                type="date"
                onChange={handleInputChange}
                style={{ display: 'none' }}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        gap: 12,
        minHeight: 50,
        marginBottom: 16
    },
    datePickerButtonText: {
        fontSize: 16,
        color: '#111827'
    }
});
