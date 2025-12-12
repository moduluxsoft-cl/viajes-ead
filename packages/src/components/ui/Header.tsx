
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {EadLogo} from '@assets/icons/ead-logo';
import PucvLogo from '@assets/icons/pucv-logo';
import {LogoutButton} from './LogoutButton';

interface AdminHeaderProps {
    title: string;
    subtitle?: string;
}

export function Header({ title, subtitle }: AdminHeaderProps) {
    return (
        <View style={styles.header}>
            <EadLogo width={40} />
            <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <View style={styles.rightSection}>
                <PucvLogo width={40} height={42} />
                <LogoutButton />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2B2B2B',
        textAlign: 'center',
        paddingBottom: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#2B2B2B',
        textAlign: 'center',
        opacity: 0.9,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
});