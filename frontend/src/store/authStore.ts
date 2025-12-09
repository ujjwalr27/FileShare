import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { user, token } = await authService.login(email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  register: async (email: string, password: string, name: string) => {
    const { user, token } = await authService.register(email, password, name);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch fresh user data from backend using relative URL
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.data;
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
        console.log('✅ User data refreshed:', user.storage_used, '/', user.storage_quota);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  },
}));
