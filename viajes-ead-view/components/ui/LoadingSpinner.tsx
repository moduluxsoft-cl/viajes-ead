import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
    message?: string;
    size?: 'small' | 'large';
    color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
                                                                  message = 'Cargando...',
                                                                  size = 'large',
                                                                  color = '#667eea'
                                                              }) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    message: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
});