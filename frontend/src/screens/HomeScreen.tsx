import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../theme/theme';
import Text from '../components/ui/Text';

export const HomeScreen: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text variant="h2" color={COLORS.textMuted}>
          Addis Ababa Map Placeholder
        </Text>
        <Text variant="caption" color={COLORS.textLight} style={styles.description}>
          Section 13 will integrate React Native Maps and Socket.io tracking.
        </Text>
      </View>
      <View style={styles.floatingCard}>
        <Text variant="h3">Selam, {user?.fullName || 'Passenger'}!</Text>
        <Text variant="caption">Where are you heading today?</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  mapIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  description: {
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  floatingCard: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default HomeScreen;
