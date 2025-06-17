import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface QRGeneratorProps {
    data: string;
}

export function QRGenerator({ data }: QRGeneratorProps) {
    if (!data) return null;

    return (
        <View style={styles.container}>
            <Image source={{ uri: data }} style={styles.qrImage} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    qrImage: {
        width: 250,
        height: 250,
    },
});