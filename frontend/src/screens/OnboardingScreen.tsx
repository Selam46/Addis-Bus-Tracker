import React, { useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  useWindowDimensions, 
  Animated, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, ROUNDNESS, SHADOWS, TYPOGRAPHY } from '../theme/theme';
import Text from '../components/ui/Text';

interface Slide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  badgeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  accentColor: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Discover Routes',
    description: 'Find routes and stops quickly. Search any neighborhood or station across the city.',
    icon: 'map-search-outline',
    badgeIcon: 'magnify',
    accentColor: COLORS.primary,
  },
  {
    id: '2',
    title: 'Track Buses Live',
    description: 'Watch buses move in real time. Never stand in uncertainty at the bus stop again.',
    icon: 'bus-marker',
    badgeIcon: 'navigation',
    accentColor: COLORS.accent,
  },
  {
    id: '3',
    title: 'Plan Your Journey',
    description: 'Get ETAs and route guidance. Find the fastest path from Megenagna to Mexico Square.',
    icon: 'transit-transfer',
    badgeIcon: 'clock-check-outline',
    accentColor: COLORS.primary,
  },
];

export const OnboardingScreen: React.FC = () => {
  const { width: windowWidth } = useWindowDimensions();
  const setOnboardingCompleted = useAuthStore((state) => state.setOnboardingCompleted);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const handleFinishOnboarding = async () => {
    await setOnboardingCompleted();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    } else {
      handleFinishOnboarding();
    }
  };

  const handleSkip = () => {
    handleFinishOnboarding();
  };

  const handleMomentumScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / windowWidth);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={[styles.slideContainer, { width: windowWidth }]}>
        <View style={styles.graphicContainer}>
          {/* Concentric rings layout for premium feel */}
          <View style={styles.outerCircle}>
            <View style={styles.middleCircle}>
              <View style={styles.glowCircle}>
                <MaterialCommunityIcons name={item.icon} size={72} color={item.accentColor} />
              </View>
            </View>
            {/* Small floating status badge */}
            <View style={[styles.badgeContainer, { backgroundColor: item.accentColor }]}>
              <MaterialCommunityIcons name={item.badgeIcon} size={18} color={COLORS.white} />
            </View>
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <Text variant="h1" style={styles.title}>
            {item.title}
          </Text>
          <Text variant="body" style={styles.description}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button in header */}
      {!isLastSlide && (
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
            <Text variant="bodySemibold" color={COLORS.textMuted}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Slide Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: windowWidth,
          offset: windowWidth * index,
          index,
        })}
        style={styles.flatList}
      />

      {/* Footer Section */}
      <View style={styles.footerContainer}>
        {/* Pagination Dots Row */}
        <View style={styles.paginationRow}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * windowWidth,
              index * windowWidth,
              (index + 1) * windowWidth,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 20, 8],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            const backgroundColor = scrollX.interpolate({
              inputRange,
              outputRange: [COLORS.borderDark, COLORS.primary, COLORS.borderDark],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity, backgroundColor }
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.primaryButton, isLastSlide && styles.getStartedButton]}
          activeOpacity={0.8}
        >
          <Text variant="button" color={COLORS.white} style={styles.buttonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
          <MaterialCommunityIcons 
            name={isLastSlide ? 'chevron-right' : 'arrow-right'} 
            size={18} 
            color={COLORS.white} 
            style={{ marginLeft: 6 }} 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.md,
  },
  skipButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  graphicContainer: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  outerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  middleCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: COLORS.primaryLight + '50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.light,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  contentContainer: {
    flex: 0.9,
    alignItems: 'center',
    paddingTop: SPACING.md,
  },
  title: {
    color: COLORS.secondary, // Dark Navy
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 26,
    marginBottom: SPACING.md,
    letterSpacing: -0.5,
  },
  description: {
    textAlign: 'center',
    color: COLORS.textMuted,
    lineHeight: 22,
    fontSize: 16,
    paddingHorizontal: SPACING.lg,
  },
  footerContainer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    width: 140,
    borderRadius: ROUNDNESS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  getStartedButton: {
    width: '100%',
    backgroundColor: COLORS.secondary, // Navy on finish
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
