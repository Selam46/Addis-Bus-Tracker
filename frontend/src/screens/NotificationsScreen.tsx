import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../theme/theme';
import Text from '../components/ui/Text';

export const NotificationsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔔</Text>
      <Text variant="h1" style={styles.title}>Notifications</Text>
      <Text variant="body" style={styles.text}>
        View arrival alerts, system notifications, and delay reports. This section will be implemented in Section 16.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    color: COLORS.primary,
    marginBottom: 8,
  },
  text: {
    textAlign: 'center',
    color: COLORS.textMuted,
    lineHeight: 22,
  },
});

export default NotificationsScreen;
