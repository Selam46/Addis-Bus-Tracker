import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../theme/theme';
import Text from '../components/ui/Text';

export const SplashScreen: React.FC = () => {
  const { initialize } = useAuthStore();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start sequence of entry animations
    Animated.sequence([
      // First, fade in and scale the logo
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Then, slide up and fade in the text
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Finally, fade in the loading spinner
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Call initialize in the background, but ensure the splash is visible for at least 2.5 seconds for a premium feel
    const initTimer = setTimeout(async () => {
      await initialize();
    }, 2500);

    return () => clearTimeout(initTimer);
  }, [initialize]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Animated.View 
          style={[
            styles.iconCircle, 
            { 
              opacity: logoOpacity, 
              transform: [{ scale: logoScale }] 
            }
          ]}
        >
          <Text style={styles.logoIcon}>🚌</Text>
        </Animated.View>
        
        <Animated.View 
          style={{ 
            opacity: textOpacity, 
            transform: [{ translateY: textTranslateY }], 
            alignItems: 'center' 
          }}
        >
          <Text variant="h1" style={styles.title}>
            Addis Bus
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Track. Ride. Arrive.
          </Text>
        </Animated.View>
      </View>
      
      <Animated.View style={[styles.loaderContainer, { opacity: loaderOpacity }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </Animated.View>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoIcon: {
    fontSize: 52,
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
  loaderContainer: {
    height: 50,
    justifyContent: 'center',
  },
});

export default SplashScreen;

