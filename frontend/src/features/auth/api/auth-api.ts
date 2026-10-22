import { apiClient } from '@/lib/api-client';
import { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  async register(credentials: RegisterCredentials): Promise<User> {
    const res = await apiClient.post<User>('/auth/register', credentials);
    return res.data;
  },

  async getProfile(): Promise<User> {
    try {
      const res = await apiClient.get<User>('/auth/profile');
      return res.data;
    } catch {
      // Fallback to /auth/me if /auth/profile is unavailable
      const meRes = await apiClient.get<{ userId: string }>('/auth/me');
      return {
        id: meRes.data.userId,
        email: '',
        name: null,
      };
    }
  },
};
