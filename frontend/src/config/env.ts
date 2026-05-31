import Constants from 'expo-constants';

const getBackendUrl = (): string => {
  // Try to extract the host computer's IP address when running via Expo Go
  const hostUri = Constants.expoConfig?.hostUri || '';
  
  if (__DEV__) {
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:5000`;
    }
    // Fallback if hostUri is not defined (e.g. built web or specific emulator setups)
    // For Android emulators, 10.0.2.2 points to host localhost
    return 'http://10.0.2.2:5000';
  }

  // Production API URL fallback
  return 'http://localhost:5000';
};

export const ENV = {
  API_URL: getBackendUrl(),
  SOCKET_URL: getBackendUrl(),
  API_TIMEOUT: 10000,
};

export default ENV;
