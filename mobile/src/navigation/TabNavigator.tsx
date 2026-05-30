// ============================================
// Bottom Tab Navigator
// ============================================
// 4 tabs: Home (Map), Search, Notifications, Profile

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View, Text, StyleSheet } from "react-native";

import { Colors, FontSize } from "../theme";
import { MainTabParamList } from "../types";

// ── Screens ───────────────────────────────────────────────
import HomeScreen from "../screens/home/HomeScreen";
import SearchScreen from "../screens/search/SearchScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  name: keyof MainTabParamList;
  label: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
  component: React.ComponentType<any>;
}

const TABS: TabConfig[] = [
  {
    name: "Home",
    label: "Map",
    icon: "map-outline",
    iconFocused: "map",
    component: HomeScreen,
  },
  {
    name: "Search",
    label: "Search",
    icon: "search-outline",
    iconFocused: "search",
    component: SearchScreen,
  },
  {
    name: "Notifications",
    label: "Alerts",
    icon: "notifications-outline",
    iconFocused: "notifications",
    component: NotificationsScreen,
  },
  {
    name: "Profile",
    label: "Profile",
    icon: "person-outline",
    iconFocused: "person",
    component: ProfileScreen,
  },
];

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBackground,
    borderTopWidth: 1,
    borderTopColor: "#DDE3EC",
    height: Platform.OS === "ios" ? 85 : 65,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    paddingTop: 8,
    ...{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    marginTop: 2,
  },
});
