import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../theme/theme';
import Text from '../components/ui/Text';

export const SplashScreen: React.FC = () => {
  const { initialize, isAuthenticated, hasCompletedOnboarding } = useAuthStore();

  useEffect(() => {
    // Simulate a brief delay to show the beautiful splash loader
    const timer = setTimeout(() => {
      initialize();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* We can use a standard Vector Icon or placeholder for the bus icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.logoIcon}>🚌</Text>
        </View>
        <Text variant="h1" style={styles.title}>
          Addis Bus
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Track. Ride. Arrive.
        </Text>
      </View>
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 48,
  },
  title: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  loader: {
    marginBottom: 20,
  },
});

export default SplashScreen;
