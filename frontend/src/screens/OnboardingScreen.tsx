import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../theme/theme';
import Text from '../components/ui/Text';

export const OnboardingScreen: React.FC = () => {
  const setOnboardingCompleted = useAuthStore((state) => state.setOnboardingCompleted);

  const handleFinishOnboarding = async () => {
    await setOnboardingCompleted();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>Onboarding Slide</Text>
        <Text variant="body" style={styles.text}>
          Welcome to Addis Bus Tracker. See live buses, routes, schedules, and get arrival alerts in real-time.
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleFinishOnboarding}>
        <Text variant="button" color={COLORS.white}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    textAlign: 'center',
    color: COLORS.textMuted,
    lineHeight: 24,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
});

export default OnboardingScreen;
