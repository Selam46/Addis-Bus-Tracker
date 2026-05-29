import axios from 'axios';
import ENV from '../config/env';
import useAuthStore from '../store/authStore';

export const apiClient = axios.create({
  baseURL: `${ENV.API_URL}/api`,
  timeout: ENV.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Inject JWT token into headers
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global response behaviors (e.g., token expiration)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 Unauthorized and not already retrying
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear local auth session and trigger redirect to login screen via Zustand
      console.warn('Unauthorized request detected. Logging out user...');
      await useAuthStore.getState().logout();
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
