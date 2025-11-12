import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface HeaderProps {
    title: string;
    rightAction?: {
        label: string;
        onPress: () => void;
    };
    gradient?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, rightAction, gradient = true }) => {
    const content = (
        <>
            <Text style={styles.title}>{title}</Text>
            {rightAction && (
                <TouchableOpacity onPress={rightAction.onPress}>
                    <Text style={styles.actionText}>{rightAction.label}</Text>
                </TouchableOpacity>
            )}
        </>
    );

    if (gradient) {
        return (
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.container}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                {content}
            </LinearGradient>
        );
    }

    return <View style={[styles.container, styles.solidHeader]}>{content}</View>;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 56,
    },
    solidHeader: {
        backgroundColor: '#667eea',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
});