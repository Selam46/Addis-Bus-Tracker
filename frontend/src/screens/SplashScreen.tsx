import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import Text from '../components/ui/Text';
import usePreferenceStore from '../store/preferenceStore';

export const SplashScreen: React.FC = () => {
  const { initialize } = useAuthStore();
  const { height, width } = useWindowDimensions();

  // Animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const patternOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animation sequence
    Animated.sequence([
      // Fade in background pattern
      Animated.timing(patternOpacity, {
        toValue: 0.25,
        duration: 800,
        useNativeDriver: true,
      }),
      // Fade in and scale up the main Logo circle
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 30,
          useNativeDriver: true,
        }),
      ]),
      // Slide up and fade in the branding text elements
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      // Fade in the loader
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Load user/auth state in background; keep splash for at least 2.6 seconds
    const initTimer = setTimeout(async () => {
      await Promise.all([
        initialize(),
        usePreferenceStore.getState().initializePreferences()
      ]);
    }, 2600);

    return () => clearTimeout(initTimer);
  }, [initialize]);

  // Render a clean grid of pattern dots for background texture
  const renderDottedPattern = () => {
    const dots = [];
    const rows = 14;
    const cols = 9;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push(
          <View
            key={`dot-${r}-${c}`}
            style={[
              styles.patternDot,
              {
                top: `${(r + 1) * 7}%`,
                left: `${(c + 1) * 10}%`,
              },
            ]}
          />
        );
      }
    }
    return (
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: patternOpacity }]}>
        {dots}
      </Animated.View>
    );
  };

  // Subtle floating background vector icons
  const renderTransitIllustrations = () => {
    return (
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: patternOpacity }]}>
        {/* Left top stop */}
        <MaterialCommunityIcons name="bus-stop" size={28} color={COLORS.primary} style={[styles.floatingIcon, { top: '15%', left: '12%', opacity: 0.15 }]} />
        {/* Right top map */}
        <MaterialCommunityIcons name="map-outline" size={32} color={COLORS.primary} style={[styles.floatingIcon, { top: '22%', right: '15%', opacity: 0.15 }]} />
        {/* Left middle clock */}
        <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.primary} style={[styles.floatingIcon, { top: '48%', left: '8%', opacity: 0.12 }]} />
        {/* Right middle stop */}
        <MaterialCommunityIcons name="map-marker-radius-outline" size={30} color={COLORS.primary} style={[styles.floatingIcon, { top: '55%', right: '10%', opacity: 0.15 }]} />
        {/* Left bottom ticket */}
        <MaterialCommunityIcons name="ticket-outline" size={26} color={COLORS.primary} style={[styles.floatingIcon, { bottom: '22%', left: '16%', opacity: 0.15 }]} />
        {/* Right bottom routes */}
        <MaterialCommunityIcons name="routes" size={28} color={COLORS.primary} style={[styles.floatingIcon, { bottom: '15%', right: '14%', opacity: 0.15 }]} />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Premium Background Layers */}
      {renderDottedPattern()}
      {renderTransitIllustrations()}

      {/* Main Branded Logo & Title Group */}
      <View style={styles.logoContainer}>
        <Animated.View
          style={[
            styles.iconCircle,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Custom vector bus icon inside inner glowing circle */}
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="bus-clock" size={48} color={COLORS.white} />
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            alignItems: 'center',
          }}
        >
          <Text variant="h1" style={styles.title}>
            Addis <Text variant="h1" color={COLORS.accent} style={{ fontWeight: '900' }}>Bus</Text>
          </Text>
          <Text variant="caption" style={styles.trackerText}>
            TRACKER
          </Text>
          <View style={styles.divider} />
          <Text variant="body" style={styles.subtitle}>
            Track. Ride. Arrive.
          </Text>
        </Animated.View>
      </View>

      {/* Modern Shimmering Progress Indicator */}
      <Animated.View style={[styles.loaderContainer, { opacity: loaderOpacity }]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text variant="caption" color={COLORS.primary} style={styles.loadingText}>
          Connecting to live tracker...
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryLight, // Premium light teal tint background
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  patternDot: {
    position: 'absolute',
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
  },
  floatingIcon: {
    position: 'absolute',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.primary, // Solid Deep Teal
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.dark,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.secondary, // Navy
    letterSpacing: -0.5,
  },
  trackerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 6,
    marginTop: 2,
    marginLeft: 6, // Compensate for letterSpacing shifting
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.accent, // Orange Divider
    borderRadius: 2,
    marginVertical: 14,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    letterSpacing: 1,
    fontWeight: '500',
  },
  loaderContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});

export default SplashScreen;
