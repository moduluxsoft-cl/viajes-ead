import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
    text: string;
    type: 'student' | 'validator';
}

export const Badge: React.FC<BadgeProps> = ({ text, type }) => {
    return (
        <View style={[styles.badge, type === 'student' ? styles.studentBadge : styles.validatorBadge]}>
            <Text style={styles.badgeText}>{text}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    studentBadge: {
        backgroundColor: '#dbeafe',
    },
    validatorBadge: {
        backgroundColor: '#fce7f3',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
});
