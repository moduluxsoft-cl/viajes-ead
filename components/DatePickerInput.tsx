import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {IoCalendar} from "react-icons/io5";

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
    const [show, setShow] = useState(false);

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShow(false); // Ocultar siempre el picker
        if (event.type === 'set' && selectedDate) {
            const newDate = new Date(selectedDate);
            newDate.setHours(8, 0, 0, 0);
            onChange(newDate);
        }
    };

    return (
        <View>
            <TouchableOpacity onPress={() => setShow(true)} style={styles.datePickerButton}>
                <IoCalendar size={20} color="#374151" />
                <Text style={styles.datePickerButtonText}>
                    {value ? formatDateToString(value) : 'Seleccionar fecha'}
                </Text>
            </TouchableOpacity>

            {show && (
                <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                />
            )}
        </View>
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
        marginBottom: 16,
    },
    datePickerButtonText: {
        fontSize: 16,
        color: '#111827'
    }
});
