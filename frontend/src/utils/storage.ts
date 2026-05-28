import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const Storage = {
  // --- Standard Storage (AsyncStorage) ---
  
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error reading key "${key}" from AsyncStorage:`, error);
      return null;
    }
  },

  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`Error writing key "${key}" to AsyncStorage:`, error);
      return false;
    }
  },

  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error deleting key "${key}" from AsyncStorage:`, error);
      return false;
    }
  },

  // --- Secure Storage (Expo SecureStore) ---
  
  async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error reading key "${key}" from SecureStore:`, error);
      return null;
    }
  },

  async setSecureItem(key: string, value: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error(`Error writing key "${key}" to SecureStore:`, error);
      return false;
    }
  },

  async removeSecureItem(key: string): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error(`Error deleting key "${key}" from SecureStore:`, error);
      return false;
    }
  },

  // --- Cleanup Helper ---
  
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
      // SecureStore does not have a clear() method, so we delete known keys manually in our application services.
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  },
};

export default Storage;
