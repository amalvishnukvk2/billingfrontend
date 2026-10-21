import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const { data } = await authAPI.login(credentials);
        localStorage.setItem('accessToken', data.accessToken);
        set({ user: data.user, isAuthenticated: true });
        return data;
      },

      logout: async () => {
        try { await authAPI.logout(); } catch {}
        localStorage.removeItem('accessToken');
        set({ user: null, isAuthenticated: false });
      },

      // Called on app startup to validate the persisted session.
      // 1. Try /auth/me with the stored access token.
      // 2. If that fails with 401, try /auth/refresh (uses httpOnly cookie).
      // 3. If refresh also fails, clear everything and go to login.
      refreshUser: async () => {
        try {
          const { data } = await authAPI.me();
          set({ user: data.user, isAuthenticated: true });
        } catch (err) {
          if (err.response?.status === 401) {
            // Access token expired — try refresh cookie
            try {
              const { data: refreshData } = await axios.post(
                `${API_URL}/auth/refresh`,
                {},
                { withCredentials: true }
              );
              localStorage.setItem('accessToken', refreshData.accessToken);
              // Now fetch user with the new token
              const { data: meData } = await authAPI.me();
              set({ user: meData.user, isAuthenticated: true });
            } catch {
              // Both failed — force logout
              localStorage.removeItem('accessToken');
              set({ user: null, isAuthenticated: false });
            }
          } else {
            localStorage.removeItem('accessToken');
            set({ user: null, isAuthenticated: false });
          }
        }
      },

      hasRole: (...roles) => roles.includes(get().user?.role),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
