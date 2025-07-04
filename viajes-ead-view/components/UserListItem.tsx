import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface UserListItemProps {
    user: {
        email: string;
        name: string;
        role: 'student' | 'validator';
    };
    onDelete: () => void;
}

export const UserListItem: React.FC<UserListItemProps> = ({ user, onDelete }) => {
    return (
        <Card style={styles.container}>
            <View style={styles.info}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.email}>{user.email}</Text>
                <View style={styles.badgeContainer}>
                    <Badge
                        text={user.role === 'student' ? 'Estudiante' : 'Validador'}
                        type={user.role}
                    />
                </View>
            </View>
            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        padding: 16,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    badgeContainer: {
        alignSelf: 'flex-start',
    },
    deleteButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        borderRadius: 16,
    },
    deleteText: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
