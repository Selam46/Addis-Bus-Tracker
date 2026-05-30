import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, TextStyles } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>👤</Text>
        <Text style={styles.title}>{user?.name ?? 'Profile'}</Text>
        <Text style={styles.sub}>Profile & settings — coming in Section 18</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.background },
  container:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },
  icon:       { fontSize: 64, marginBottom: Spacing.lg },
  title:      { ...TextStyles.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sub:        { ...TextStyles.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing['2xl'] },
  logoutBtn:  { backgroundColor: Colors.error, paddingVertical: Spacing.sm, paddingHorizontal: Spacing['2xl'], borderRadius: 8 },
  logoutText: { ...TextStyles.button, color: Colors.textInverse },
});
