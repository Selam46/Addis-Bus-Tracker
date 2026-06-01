import { create } from 'zustand';
import Storage from '../utils/storage';
import { updateThemeColors } from '../theme/theme';

export type ThemeMode = 'light' | 'dark' | 'system';
export type LanguageMode = 'en' | 'am';

interface PreferenceState {
  theme: ThemeMode;
  language: LanguageMode;
  busAlerts: boolean;
  etaAlerts: boolean;
  appUpdates: boolean;
  
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: LanguageMode) => Promise<void>;
  setBusAlerts: (val: boolean) => Promise<void>;
  setEtaAlerts: (val: boolean) => Promise<void>;
  setAppUpdates: (val: boolean) => Promise<void>;
  initializePreferences: () => Promise<void>;
}

const STORAGE_KEYS = {
  THEME: 'pref_theme',
  LANGUAGE: 'pref_language',
  BUS_ALERTS: 'pref_bus_alerts',
  ETA_ALERTS: 'pref_eta_alerts',
  APP_UPDATES: 'pref_app_updates',
};

export const usePreferenceStore = create<PreferenceState>((set) => ({
  theme: 'light',
  language: 'en',
  busAlerts: true,
  etaAlerts: true,
  appUpdates: false,

  setTheme: async (theme) => {
    await Storage.setItem(STORAGE_KEYS.THEME, theme);
    // Apply dynamic theme color swap
    const appliedMode = theme === 'system' ? 'light' : theme; // Fallback system to light for mock simplicity
    updateThemeColors(appliedMode);
    set({ theme });
  },

  setLanguage: async (language) => {
    await Storage.setItem(STORAGE_KEYS.LANGUAGE, language);
    set({ language });
  },

  setBusAlerts: async (val) => {
    await Storage.setItem(STORAGE_KEYS.BUS_ALERTS, val);
    set({ busAlerts: val });
  },

  setEtaAlerts: async (val) => {
    await Storage.setItem(STORAGE_KEYS.ETA_ALERTS, val);
    set({ etaAlerts: val });
  },

  setAppUpdates: async (val) => {
    await Storage.setItem(STORAGE_KEYS.APP_UPDATES, val);
    set({ appUpdates: val });
  },

  initializePreferences: async () => {
    try {
      const [theme, language, busAlerts, etaAlerts, appUpdates] = await Promise.all([
        Storage.getItem<ThemeMode>(STORAGE_KEYS.THEME),
        Storage.getItem<LanguageMode>(STORAGE_KEYS.LANGUAGE),
        Storage.getItem<boolean>(STORAGE_KEYS.BUS_ALERTS),
        Storage.getItem<boolean>(STORAGE_KEYS.ETA_ALERTS),
        Storage.getItem<boolean>(STORAGE_KEYS.APP_UPDATES),
      ]);

      const finalTheme = theme || 'light';
      updateThemeColors(finalTheme === 'system' ? 'light' : finalTheme);

      set({
        theme: finalTheme,
        language: language || 'en',
        busAlerts: busAlerts !== null ? busAlerts : true,
        etaAlerts: etaAlerts !== null ? etaAlerts : true,
        appUpdates: appUpdates !== null ? appUpdates : false,
      });
    } catch (error) {
      console.error('Error initializing preferences:', error);
    }
  },
}));

export default usePreferenceStore;
