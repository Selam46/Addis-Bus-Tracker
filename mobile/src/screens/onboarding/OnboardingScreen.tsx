// ============================================
// Onboarding Screen
// ============================================
// 3 premium swipeable slides:
//   1. Live Bus Tracking  — location pin
//   2. Smart Schedules    — clock
//   3. Arrival Alerts     — bell
//
// • Swipe left/right OR tap buttons to navigate
// • Slides 1 & 2: Skip (left) + Continue (right)
// • Slide 3:      full-width "Get Started" button
// • Any Skip → goes directly to Login

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../theme";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────
// Slide data
// ─────────────────────────────────────────────
interface Slide {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: "1",
    icon: "location-sharp",
    title: "Live Bus Tracking",
    subtitle:
      "See exactly where your bus is in real-time on the map. Never miss your ride again.",
  },
  {
    id: "2",
    icon: "time",
    title: "Smart Schedules",
    subtitle:
      "Check bus schedules and get accurate ETAs for your stop. Plan your journey with confidence.",
  },
  {
    id: "3",
    icon: "notifications",
    title: "Arrival Alerts",
    subtitle:
      "Get notified when your bus is approaching. Sit back and relax until it's time to go.",
  },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const setHasOnboarded = useAuthStore((s) => s.setHasOnboarded);

  const isLast = activeIndex === SLIDES.length - 1;

  // ── Advance / finish ──────────────────────
  const handleContinue = () => {
    if (isLast) {
      setHasOnboarded(); // → store change triggers RootNavigator to show Auth
    } else {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }
  };

  // ── Skip → jump straight to Auth ─────────
  const handleSkip = () => {
    setHasOnboarded();
  };

  // ── Track page when user swipes manually ─
  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  // ─────────────────────────────────────────
  // Render one slide
  // ─────────────────────────────────────────
  const renderItem: ListRenderItem<Slide> = ({ item }) => (
    <View style={styles.slide}>
      {/* Large circle with icon */}
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon} size={62} color={Colors.primary} />
      </View>

      {/* Title */}
      <Text style={styles.title}>{item.title}</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Slide carousel ─────────────────── */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.list}
      />

      {/* ── Dot indicators ─────────────────── */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotOn : styles.dotOff,
            ]}
          />
        ))}
      </View>

      {/* ── Bottom buttons ─────────────────── */}
      {isLast ? (
        // Last slide — full-width Get Started
        <View style={styles.bottomFull}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Slides 1 & 2 — Skip + Continue
        <View style={styles.bottomRow}>
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // ── FlatList ──────────────────────────────
  list: {
    flex: 1,
  },

  // ── Each slide ────────────────────────────
  // Content is centered; paddingBottom nudges it
  // slightly above dead-center for visual balance.
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },

  // ── Icon circle ───────────────────────────
  iconCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: Colors.primaryBg, // soft teal tint
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 52,
  },

  // ── Title ─────────────────────────────────
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.2,
  },

  // ── Subtitle ──────────────────────────────
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 300,
  },

  // ── Dot row ───────────────────────────────
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },

  dot: {
    borderRadius: 999,
  },

  dotOn: {
    width: 10,
    height: 10,
    backgroundColor: Colors.dotActive,
  },

  dotOff: {
    width: 8,
    height: 8,
    backgroundColor: Colors.dotInactive,
  },

  // ── Bottom: slides 1 & 2 ──────────────────
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 36,
    paddingTop: 4,
  },

  skipText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textSecondary,
  },

  continueBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 32,
    // subtle shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  continueText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // ── Bottom: last slide ────────────────────
  bottomFull: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 4,
  },

  getStartedBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    // subtle shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  getStartedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
