import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/theme';
import Text from '../components/ui/Text';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const login = useAuthStore((state) => state.login);

  const handleRegister = async () => {
    // Simulate user registration
    await login(
      {
        id: '2',
        fullName: 'Selam Hailu',
        email: 'selam@example.com',
        phone: '+251911987654',
      },
      'mock-jwt-token-67890'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>Create Account</Text>
        <Text variant="body" style={styles.subtitle}>Join Addis Bus to start tracking</Text>
        
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text variant="button" color={COLORS.white}>Create Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.loginLink} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text variant="caption" color={COLORS.primary}>
            Already have an account? <Text variant="caption" color={COLORS.primary} style={styles.underline}>Sign In</Text>
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
  registerButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginLink: {
    marginTop: 8,
  },
  underline: {
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
