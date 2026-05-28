import { create } from 'zustand';
import Storage from '../utils/storage';

export interface User {
  id: string | number;
  fullName: string;
  email: string;
  phone?: string;
  pushToken?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingCompleted: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const STORAGE_KEYS = {
  USER: 'addis_bus_user',
  TOKEN: 'addis_bus_token',
  ONBOARDING: 'addis_bus_onboarding_completed',
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  isLoading: true,

  initialize: async () => {
    try {
      const [token, user, onboardingCompleted] = await Promise.all([
        Storage.getSecureItem(STORAGE_KEYS.TOKEN),
        Storage.getItem<User>(STORAGE_KEYS.USER),
        Storage.getItem<boolean>(STORAGE_KEYS.ONBOARDING),
      ]);

      set({
        token,
        user,
        isAuthenticated: !!token && !!user,
        hasCompletedOnboarding: !!onboardingCompleted,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error initializing auth state:', error);
      set({ isLoading: false });
    }
  },

  login: async (user, token) => {
    try {
      await Promise.all([
        Storage.setSecureItem(STORAGE_KEYS.TOKEN, token),
        Storage.setItem(STORAGE_KEYS.USER, user),
      ]);
      set({ user, token, isAuthenticated: true });
    } catch (error) {
      console.error('Error storing login data:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await Promise.all([
        Storage.removeSecureItem(STORAGE_KEYS.TOKEN),
        Storage.removeItem(STORAGE_KEYS.USER),
      ]);
      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('Error removing auth session:', error);
    }
  },

  setOnboardingCompleted: async () => {
    try {
      await Storage.setItem(STORAGE_KEYS.ONBOARDING, true);
      set({ hasCompletedOnboarding: true });
    } catch (error) {
      console.error('Error storing onboarding state:', error);
    }
  },

  updateUser: (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      Storage.setItem(STORAGE_KEYS.USER, updatedUser);
      set({ user: updatedUser });
    }
  },
}));

export default useAuthStore;
