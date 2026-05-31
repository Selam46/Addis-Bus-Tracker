import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { COLORS } from '../theme/theme';
import { RootStackParamList, AuthStackParamList, MainTabParamList } from './types';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import RoutesScreen from '../screens/RoutesScreen';
import SchedulesScreen from '../screens/SchedulesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Main Tab Bar Navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.background,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: COLORS.primary,
          fontWeight: 'bold',
          fontSize: 18,
        },
        tabBarIcon: ({ focused }) => {
          let emoji = '❓';
          if (route.name === 'Home') emoji = '🗺️';
          else if (route.name === 'Routes') emoji = '🚍';
          else if (route.name === 'Schedules') emoji = '📅';
          else if (route.name === 'Notifications') emoji = '🔔';
          else if (route.name === 'Profile') emoji = '👤';

          return (
            <View style={styles.iconContainer}>
              <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.4 }]}>
                {emoji}
              </Text>
            </View>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 72,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Live Tracker', headerShown: false }} 
      />
      <Tab.Screen 
        name="Routes" 
        component={RoutesScreen} 
        options={{ title: 'Routes & Stops' }} 
      />
      <Tab.Screen 
        name="Schedules" 
        component={SchedulesScreen} 
        options={{ title: 'Schedules' }} 
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Arrival Alerts' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
    </Tab.Navigator>
  );
};

// Root Navigator
export const AppNavigator = () => {
  const { isLoading, isAuthenticated, hasCompletedOnboarding } = useAuthStore();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!hasCompletedOnboarding ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 20,
  },
});

export default AppNavigator;
