// ============================================
// App Entry Point
// ============================================
// Wraps the entire app with:
//   - GestureHandlerRootView (required by React Navigation)
//   - SafeAreaProvider       (required by react-native-safe-area-context)
//   - RootNavigator          (handles auth state → which screens to show)

import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import RootNavigator from "./src/navigation";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
