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

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be under 100 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    phone: z
      .string()
      .transform((val) => (val === '' ? undefined : val))
      .optional()
      .refine(
        (val) => !val || /^\+?[0-9]{9,15}$/.test(val),
        'Phone number must be 9–15 digits and may start with +. Example: +251911234567'
      ),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterScreen: React.FC = () => {
  const login = useAuthStore((state) => state.login);
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const response = await authApi.register({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone ? data.phone.trim() : undefined,
        password: data.password,
      });

      // Map backend `name` to UI expected `fullName`
      const user = {
        id: response.data.user.id,
        fullName: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone || undefined,
        pushToken: response.data.user.pushToken || undefined,
        createdAt: response.data.user.createdAt,
      };

      // Automatically log the passenger in on successful signup
      await login(user, response.data.token);
    } catch (error: any) {
      console.error('Registration error:', error);
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
        {/* Header branding */}
        <View style={styles.logoHeader}>
          <View style={styles.iconCircle}>
            <Text style={styles.logoIcon}>🚌</Text>
          </View>
          <Text variant="h1" style={styles.brandTitle}>
            Addis Bus
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text variant="h2" style={styles.title}>
            Create Account
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Join Addis Bus to start tracking in real-time
          </Text>

          {/* Error Banner */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText} color={COLORS.white}>
                {errorMsg}
              </Text>
            </View>
          )}

          {/* Name input */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Abebe Kebede"
                autoCapitalize="words"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                icon="👤"
              />
            )}
          />

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

          {/* Phone input */}
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone Number (Optional)"
                placeholder="+251911234567"
                keyboardType="phone-pad"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
                icon="📞"
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

          {/* Confirm Password input */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="••••••••"
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                icon="🔒"
              />
            )}
          />

          {/* Create Account Button */}
          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.registerBtn}
          />

          {/* Login Navigation Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.6}
          >
            <Text variant="body" color={COLORS.textMuted}>
              Already have an account?{' '}
              <Text variant="bodySemibold" color={COLORS.primary}>
                Sign In
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
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 20,
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
  registerBtn: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
});

export default RegisterScreen;
