// ============================================
// Login Screen
// ============================================
// • Email + password inputs (react-hook-form)
// • Show/hide password toggle
// • Calls POST /api/auth/login
// • On success → saves token via authStore.login()
//   → RootNavigator auto-switches to Main tabs
// • Inline field validation + API error banner

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
type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

interface LoginForm {
  email: string;
  password: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function LoginScreen({ navigation }: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
  });

  // ─────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────
  const onSubmit = async (data: LoginForm) => {
    setApiError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post<AuthResponse>("/api/auth/login", {
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      const { token, user } = res.data.data;
      await login(token, user);
      // RootNavigator will detect isLoggedIn = true and switch to Main
    } catch (err: any) {
      setApiError(err.message || "Login failed. Please try again.");
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
          {/* ── Header icon ───────────────────────── */}
          <View style={styles.iconCircle}>
            <Ionicons name="bus" size={38} color={Colors.primary} />
          </View>

          {/* ── Titles ────────────────────────────── */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to track buses across Addis Ababa
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
                  placeholder="Enter your password"
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

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Divider ───────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Register link ─────────────────────── */}
          <TouchableOpacity
            style={styles.registerRow}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.7}
          >
            <Text style={styles.registerPrompt}>Don't have an account? </Text>
            <Text style={styles.registerLink}>Create one</Text>
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
    paddingTop: Spacing["3xl"],
    alignItems: "center",
  },

  // ── Icon circle ───────────────────────────
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing["2xl"],
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

  // ── Login button ──────────────────────────
  loginBtn: {
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

  loginBtnDisabled: {
    opacity: 0.7,
  },

  loginBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: "#FFF",
    letterSpacing: 0.3,
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

  // ── Register row ──────────────────────────
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  registerPrompt: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },

  registerLink: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
