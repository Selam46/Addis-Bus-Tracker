// ============================================
// Axios API Client
// ============================================
// Central HTTP client with:
//   - Base URL pointing to the backend
//   - Auto-attach JWT token on every request
//   - Consistent error handling

import axios from "axios";
import * as SecureStore from "expo-secure-store";

// ── Base URL ──────────────────────────────────────────────
// Change this to your machine's local IP when testing on a
// physical Android device (emulators use 10.0.2.2).
//
// ⚠️  localhost/127.0.0.1 does NOT work on a real device.
//    Run `ipconfig` (Windows) to find your local IP.
//    Example: 'http://192.168.1.100:5000'

// 📱 Physical device (Expo Go) → use your machine's Wi-Fi IP
// 🖥️  Android emulator              → use 10.0.2.2:5000
// Run `ipconfig` on Windows to find your Wi-Fi IPv4 address
export const API_BASE_URL = "http://10.4.110.17:5000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach JWT ───────────────────────
// Before every request, read the saved token from SecureStore
// and add it to the Authorization header.
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore unavailable (e.g. web) — skip silently
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: normalize errors ────────────────
// Extracts the backend error message so callers can do:
//   catch (err) { console.log(err.message) }
// instead of digging into err.response.data.message
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong. Please try again.";

    // Attach the clean message to the error object
    error.message = message;
    return Promise.reject(error);
  },
);

export default apiClient;
