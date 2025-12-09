import api from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await api.post<{ data: AuthResponse }>('/auth/register', {
      email,
      password,
      name,
    });
    return response.data.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<{ data: AuthResponse }>('/auth/login', {
      email,
      password,
    });
    return response.data.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<{ data: User }>('/auth/profile');
    return response.data.data;
  },

  async updateProfile(data: { name?: string; email?: string }): Promise<User> {
    const response = await api.put<{ data: User }>('/auth/profile', data);
    return response.data.data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { oldPassword, newPassword });
  },
};
