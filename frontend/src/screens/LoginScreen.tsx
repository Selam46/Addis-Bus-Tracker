import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../theme/theme';
import Text from '../components/ui/Text';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const login = useAuthStore((state) => state.login);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleLogin = async () => {
    // Simulate login for testing routing
    await login(
      {
        id: '1',
        fullName: 'Abebe Kebede',
        email: 'abebe@example.com',
        phone: '+251911234567',
      },
      'mock-jwt-token-12345'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>Welcome Back</Text>
        <Text variant="body" style={styles.subtitle}>Sign in to track your bus</Text>
        
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text variant="button" color={COLORS.white}>Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.registerLink} 
          onPress={() => navigation.navigate('Register')}
        >
          <Text variant="caption" color={COLORS.primary}>
            Don't have an account? <Text variant="caption" color={COLORS.primary} style={styles.underline}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textMuted,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  registerLink: {
    marginTop: 8,
  },
  underline: {
    fontWeight: 'bold',
  },
});

export default LoginScreen;
