// ============================================
// Auth Store — Zustand
// ============================================
// Global authentication state.
// Persists the JWT token in SecureStore so the
// user stays logged in after closing the app.

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import apiClient from '../api/client';

interface AuthState {
  user:          User | null;
  token:         string | null;
  isLoading:     boolean;      // true while checking stored token on boot
  isLoggedIn:    boolean;
  hasOnboarded:  boolean;      // false = show onboarding screens

  // Actions
  login:         (token: string, user: User) => Promise<void>;
  logout:        () => Promise<void>;
  setUser:       (user: User) => void;
  setHasOnboarded: () => Promise<void>;
  checkAuth:     () => Promise<void>;  // called on app start
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:         null,
  token:        null,
  isLoading:    true,
  isLoggedIn:   false,
  hasOnboarded: false,

  // ─────────────────────────────────────────
  // LOGIN — save token + user to state and SecureStore
  // ─────────────────────────────────────────
  login: async (token, user) => {
    await SecureStore.setItemAsync('auth_token', token);
    set({ token, user, isLoggedIn: true });
  },

  // ─────────────────────────────────────────
  // LOGOUT — clear everything
  // ─────────────────────────────────────────
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null, isLoggedIn: false });
  },

  // ─────────────────────────────────────────
  // SET USER — update the user profile in state
  // (e.g. after editing name/phone)
  // ─────────────────────────────────────────
  setUser: (user) => set({ user }),

  // ─────────────────────────────────────────
  // SET HAS ONBOARDED — called after user
  // swipes through onboarding screens for the
  // first time. Persisted so it doesn't show again.
  // ─────────────────────────────────────────
  setHasOnboarded: async () => {
    await SecureStore.setItemAsync('has_onboarded', 'true');
    set({ hasOnboarded: true });
  },

  // ─────────────────────────────────────────
  // CHECK AUTH — called once on app startup.
  // Reads the stored token and fetches the
  // current user profile to validate the session.
  // If the token is expired/invalid, logs out.
  // ─────────────────────────────────────────
  checkAuth: async () => {
    try {
      const [token, onboarded] = await Promise.all([
        SecureStore.getItemAsync('auth_token'),
        SecureStore.getItemAsync('has_onboarded'),
      ]);

      set({ hasOnboarded: onboarded === 'true' });

      if (!token) {
        set({ isLoading: false, isLoggedIn: false });
        return;
      }

      // Validate token by fetching the current user
      const response = await apiClient.get('/api/auth/me');
      const user: User = response.data.data.user;

      set({ token, user, isLoggedIn: true, isLoading: false });
    } catch {
      // Token is invalid or expired — clear it
      await SecureStore.deleteItemAsync('auth_token');
      set({ token: null, user: null, isLoggedIn: false, isLoading: false });
    }
  },
}));
