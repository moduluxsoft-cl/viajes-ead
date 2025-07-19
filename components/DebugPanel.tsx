import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export const DebugPanel: React.FC = () => {
    const { user, userData, loading } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔍 DEBUG PANEL</Text>
            <ScrollView style={styles.content}>
                <Text style={styles.section}>AUTH LOADING:</Text>
                <Text style={styles.value}>{loading ? 'true' : 'false'}</Text>

                <Text style={styles.section}>USER (Firebase Auth):</Text>
                <Text style={styles.value}>
                    {user ? JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        emailVerified: user.emailVerified
                    }, null, 2) : 'null'}
                </Text>

                <Text style={styles.section}>USER DATA (Firestore):</Text>
                <Text style={styles.value}>
                    {userData ? JSON.stringify(userData, null, 2) : 'null'}
                </Text>

                <Text style={styles.section}>READY FOR QUERIES:</Text>
                <Text style={[styles.value, {
                    color: (!loading && userData?.uid) ? '#10b981' : '#ef4444'
                }]}>
                    {(!loading && userData?.uid) ? '✅ YES' : '❌ NO'}
                </Text>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 16,
        margin: 16,
        maxHeight: 300,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#1f2937',
    },
    content: {
        flex: 1,
    },
    section: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
        marginTop: 12,
        marginBottom: 4,
    },
    value: {
        fontSize: 11,
        color: '#1f2937',
        fontFamily: 'monospace',
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 4,
    },
});
