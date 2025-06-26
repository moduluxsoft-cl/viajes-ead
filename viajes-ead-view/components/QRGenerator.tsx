import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRGeneratorProps {
    data: string;
    size?: number;
    showData?: boolean;
}

export function QRGenerator({ data, size = 250, showData = false }: QRGeneratorProps) {
    if (!data) {
        return (
            <View style={[styles.container, { width: size, height: size }]}>
                <Text style={styles.errorText}>Sin datos para generar QR</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <QRCode
                value={data}
                size={size}
                backgroundColor="white"
                color="black"
                logoSize={30}
                logoBackgroundColor="transparent"
            />
            {showData && (
                <Text style={styles.dataText} numberOfLines={3}>
                    {data.substring(0, 50)}...
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
    dataText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 10,
        textAlign: 'center',
    },
});