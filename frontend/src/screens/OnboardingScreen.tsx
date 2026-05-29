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
import { COLORS, SPACING, ROUNDNESS } from '../theme/theme';
import Text from '../components/ui/Text';

interface Slide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Live Bus Tracking',
    description: 'See exactly where your bus is in real-time on the map. Never miss your ride again.',
    icon: 'map-marker',
  },
  {
    id: '2',
    title: 'Smart Schedules',
    description: 'Check bus schedules and get accurate ETAs for your stop. Plan your journey with confidence.',
    icon: 'clock-outline',
  },
  {
    id: '3',
    title: 'Arrival Alerts',
    description: 'Get notified when your bus is approaching. Sit back and relax until it\'s time to go.',
    icon: 'bell-outline',
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
          <View style={styles.glowCircle}>
            <MaterialCommunityIcons name={item.icon} size={64} color={COLORS.primary} />
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
        {!isLastSlide ? (
          <View style={styles.rowFooter}>
            {/* Skip Button */}
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
              <Text variant="bodySemibold" color={COLORS.textMuted} style={styles.footerTextButton}>
                Skip
              </Text>
            </TouchableOpacity>

            {/* Pagination Dots */}
            <View style={styles.paginationRow}>
              {slides.map((_, index) => {
                const inputRange = [
                  (index - 1) * windowWidth,
                  index * windowWidth,
                  (index + 1) * windowWidth,
                ];

                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [8, 16, 8],
                  extrapolate: 'clamp',
                });

                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });

                const backgroundColor = scrollX.interpolate({
                  inputRange,
                  outputRange: [COLORS.border, COLORS.primary, COLORS.border],
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

            {/* Continue Button */}
            <TouchableOpacity onPress={handleNext} style={styles.continueButton} activeOpacity={0.8}>
              <Text variant="button" color={COLORS.white}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.columnFooter}>
            {/* Pagination Dots above the button */}
            <View style={[styles.paginationRow, { marginBottom: SPACING.xl }]}>
              {slides.map((_, index) => {
                const inputRange = [
                  (index - 1) * windowWidth,
                  index * windowWidth,
                  (index + 1) * windowWidth,
                ];

                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [8, 16, 8],
                  extrapolate: 'clamp',
                });

                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });

                const backgroundColor = scrollX.interpolate({
                  inputRange,
                  outputRange: [COLORS.border, COLORS.primary, COLORS.border],
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

            {/* Get Started Button */}
            <TouchableOpacity onPress={handleFinishOnboarding} style={styles.getStartedButton} activeOpacity={0.8}>
              <Text variant="button" color={COLORS.white}>
                Get Started
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  glowCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#E6F4F4', // Premium very light teal
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  title: {
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: SPACING.md,
  },
  description: {
    textAlign: 'center',
    color: COLORS.textMuted,
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  footerContainer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: 40,
    minHeight: 120,
    justifyContent: 'center',
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  columnFooter: {
    alignItems: 'center',
    width: '100%',
  },
  skipButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  footerTextButton: {
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    width: 120,
    borderRadius: ROUNDNESS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    width: '100%',
    borderRadius: ROUNDNESS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default OnboardingScreen;


