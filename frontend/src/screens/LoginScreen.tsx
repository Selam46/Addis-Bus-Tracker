import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { COLORS, SPACING, ROUNDNESS } from '../theme/theme';
import Text from '../components/ui/Text';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ScreenContainer from '../components/ui/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginScreen: React.FC = () => {
  const login = useAuthStore((state) => state.login);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const response = await authApi.login({
        email: data.email.trim(),
        password: data.password,
      });

      // Map backend `name` parameter to UI expected `fullName`
      const user = {
        id: response.data.user.id,
        fullName: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone || undefined,
        pushToken: response.data.user.pushToken || undefined,
        createdAt: response.data.user.createdAt,
      };

      await login(user, response.data.token);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Unable to connect to the server. Please check your network connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable safe style={styles.container}>
      <View style={styles.content}>
        {/* Brand Logo Header */}
        <View style={styles.logoHeader}>
          <View style={styles.iconCircle}>
            <Text style={styles.logoIcon}>🚌</Text>
          </View>
          <Text variant="h1" style={styles.brandTitle}>
            Addis Bus
          </Text>
          <Text variant="body" style={styles.brandSubtitle}>
            Track. Ride. Arrive.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text variant="h2" style={styles.title}>
            Welcome Back
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Sign in to track your bus in real-time
          </Text>

          {/* Error Banner */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText} color={COLORS.white}>
                {errorMsg}
              </Text>
            </View>
          )}

          {/* Email input */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                placeholder="example@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                icon="✉️"
              />
            )}
          />

          {/* Password input */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                icon="🔒"
              />
            )}
          />

          {/* Login Button */}
          <Button
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.loginBtn}
          />

          {/* Sign Up Navigation Link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.6}
          >
            <Text variant="body" color={COLORS.textMuted}>
              Don't have an account?{' '}
              <Text variant="bodySemibold" color={COLORS.primary}>
                Sign Up
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
  },
  logoHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logoIcon: {
    fontSize: 32,
  },
  brandTitle: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  brandSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  formContainer: {
    backgroundColor: COLORS.background,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  errorBanner: {
    backgroundColor: COLORS.danger,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    marginBottom: SPACING.lg,
  },
  errorBannerText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  loginBtn: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
});

export default LoginScreen;
