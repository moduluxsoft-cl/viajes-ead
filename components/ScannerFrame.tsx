import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ScannerFrame: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.overlay}>
                <View style={styles.scanArea}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>
            </View>
            <Text style={styles.instruction}>Alinea el código QR dentro del marco</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        width: 250,
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanArea: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#667eea',
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    instruction: {
        color: '#fff',
        fontSize: 16,
        marginTop: 20,
        textAlign: 'center',
    },
});