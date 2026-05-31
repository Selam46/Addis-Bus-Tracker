import apiClient from './client';

export interface UserResponseData {
  id: string | number;
  name: string;
  email: string;
  phone: string | null;
  pushToken: string | null;
  createdAt: string;
}

export interface AuthSuccessResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: UserResponseData;
  };
}

export interface LoginParams {
  email: string;
  password?: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}

export const authApi = {
  login: async (params: LoginParams): Promise<AuthSuccessResponse> => {
    const response = await apiClient.post<AuthSuccessResponse>('/auth/login', params);
    return response.data;
  },

  register: async (params: RegisterParams): Promise<AuthSuccessResponse> => {
    const response = await apiClient.post<AuthSuccessResponse>('/auth/register', params);
    return response.data;
  },
};

export default authApi;
