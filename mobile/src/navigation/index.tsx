// ============================================
// Root Navigator
// ============================================
// Decides which stack to show based on auth state:
//
//   isLoading  → SplashScreen (boot check)
//   !onboarded → Onboarding
//   !loggedIn  → Auth stack  (Login / Register)
//   loggedIn   → Main stack  (Tabs + detail screens)

import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { useAuthStore } from "../store/authStore";
import { Colors } from "../theme";
import {
  RootStackParamList,
  AuthStackParamList,
  MainStackParamList,
} from "../types";

// ── Screens ───────────────────────────────────────────────
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ScheduleScreen from "../screens/schedule/ScheduleScreen";
import FeedbackScreen from "../screens/feedback/FeedbackScreen";
import RouteDetailScreen from "../screens/search/RouteDetailScreen";
import TabNavigator from "./TabNavigator";

// Keep the native splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

// ── Sub-stack navigators ──────────────────────────────────
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab bar — the "home base" */}
      <MainStack.Screen name="Tabs" component={TabNavigator} />

      {/* Screens pushed on top of tabs */}
      <MainStack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ headerShown: true, title: "Schedule & ETA" }}
      />
      <MainStack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ headerShown: true, title: "Submit Feedback" }}
      />
      <MainStack.Screen
        name="RouteDetail"
        component={RouteDetailScreen}
        options={{ headerShown: false }}
      />
    </MainStack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────
const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isLoading, isLoggedIn, hasOnboarded, checkAuth } = useAuthStore();

  // On first mount, check if we have a stored session
  useEffect(() => {
    checkAuth().finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  // While we're checking the stored token, show a spinner
  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {!hasOnboarded ? (
          <Root.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isLoggedIn ? (
          <Root.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Root.Screen name="Main" component={MainNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});
