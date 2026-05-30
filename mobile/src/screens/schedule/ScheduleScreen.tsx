import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, TextStyles } from '../../theme';

export default function ScheduleScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>📅</Text>
        <Text style={styles.title}>Schedule & ETA</Text>
        <Text style={styles.sub}>Timetable & countdowns — coming in Section 15</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },
  icon:      { fontSize: 64, marginBottom: Spacing.lg },
  title:     { ...TextStyles.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sub:       { ...TextStyles.body, color: Colors.textSecondary, textAlign: 'center' },
});
