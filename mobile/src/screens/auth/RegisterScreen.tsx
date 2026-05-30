// ============================================
// Register Screen
// ============================================
// • Name, Email, Phone (optional), Password inputs
// • react-hook-form validation
// • Calls POST /api/auth/register
// • On success → saves token via authStore.login()
//   → RootNavigator auto-switches to Main tabs
// • Inline field errors + API error banner

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AuthStackParamList, AuthResponse } from "../../types";
import { useAuthStore } from "../../store/authStore";
import apiClient from "../../api/client";
import Input from "../../components/ui/Input";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
} from "../../theme";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function RegisterScreen({ navigation }: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((s) => s.login);

  // Refs for focus chaining (name → email → phone → password)
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  // ─────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────
  const onSubmit = async (data: RegisterForm) => {
    setApiError(null);
    setIsLoading(true);

    try {
      const payload: Record<string, string> = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      };

      // Only include phone if the user typed something
      if (data.phone.trim()) {
        payload.phone = data.phone.trim();
      }

      const res = await apiClient.post<AuthResponse>(
        "/api/auth/register",
        payload,
      );

      const { token, user } = res.data.data;
      await login(token, user);
      // RootNavigator detects isLoggedIn = true → switches to Main
    } catch (err: any) {
      setApiError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back button ───────────────────────── */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* ── Header icon ───────────────────────── */}
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={36} color={Colors.primary} />
          </View>

          {/* ── Titles ────────────────────────────── */}
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join thousands of Addis Ababa commuters
          </Text>

          {/* ── API error banner ──────────────────── */}
          {apiError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorBannerText}>{apiError}</Text>
            </View>
          ) : null}

          {/* ── Form ──────────────────────────────── */}
          <View style={styles.form}>
            {/* Full Name */}
            <Controller
              control={control}
              name="name"
              rules={{
                required: "Full name is required.",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters.",
                },
                maxLength: { value: 100, message: "Name is too long." },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="e.g. Abebe Bekele"
                  autoComplete="name"
                  returnKeyType="next"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              )}
            />

            {/* Email */}
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required.",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address.",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  ref={emailRef}
                  label="Email Address"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              )}
            />

            {/* Phone (optional) */}
            <Controller
              control={control}
              name="phone"
              rules={{
                pattern: {
                  value: /^\+?[0-9]{9,15}$/,
                  message: "Use format: +251911234567 (9–15 digits).",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  ref={phoneRef}
                  label="Phone Number"
                  placeholder="+251911234567  (optional)"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  returnKeyType="next"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  hint="Ethiopian format: +251 followed by 9 digits"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              )}
            />

            {/* Password */}
            <Controller
              control={control}
              name="password"
              rules={{
                required: "Password is required.",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters.",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  ref={passwordRef}
                  label="Password"
                  placeholder="Min. 6 characters"
                  isPassword
                  returnKeyType="done"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />

            {/* Register button */}
            <TouchableOpacity
              style={[
                styles.registerBtn,
                isLoading && styles.registerBtnDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.registerBtnText}>Create Account</Text>
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Terms note */}
            <Text style={styles.termsText}>
              By registering you agree to our Terms of Service and Privacy
              Policy.
            </Text>
          </View>

          {/* ── Login link ────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.loginRow}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>

          {/* Bottom padding */}
          <View style={{ height: Spacing["2xl"] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  kav: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    alignItems: "center",
  },

  // ── Back button ───────────────────────────
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.sm,
  },

  // ── Icon circle ───────────────────────────
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.base,
    ...Shadow.md,
  },

  // ── Titles ────────────────────────────────
  title: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },

  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: FontSize.md * 1.5,
    maxWidth: 280,
  },

  // ── Error banner ──────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    width: "100%",
  },

  errorBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },

  // ── Form ──────────────────────────────────
  form: {
    width: "100%",
  },

  // ── Register button ───────────────────────
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    marginTop: Spacing.sm,
    ...Shadow.md,
    shadowColor: Colors.primary,
  },

  registerBtnDisabled: {
    opacity: 0.7,
  },

  registerBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: "#FFF",
    letterSpacing: 0.3,
  },

  termsText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: FontSize.xs * 1.6,
  },

  // ── Divider ───────────────────────────────
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.xl,
    width: "100%",
    gap: Spacing.sm,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },

  dividerText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },

  // ── Login row ─────────────────────────────
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  loginPrompt: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },

  loginLink: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
