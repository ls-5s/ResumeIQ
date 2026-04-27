import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  token: string;
  refreshToken?: string;
  username?: string;
  email?: string;
  avatar?: string | null;
}

interface LoginState {
  token: string;
  refreshToken: string;
  user: User | null;
  isLoggedIn: boolean;
  login: (userData: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setUser: (userData: Partial<User>) => void;
  logout: () => void;
}

export const useLoginStore = create<LoginState>()(
  persist(
    (set) => ({
      token: '',
      refreshToken: '',
      user: null,
      isLoggedIn: false,

      login: (userData: User) => {
        set({
          token: userData.token,
          refreshToken: userData.refreshToken || '',
          user: userData,
          isLoggedIn: true,
        });
      },

      setTokens: (token: string, refreshToken: string) => {
        set({ token, refreshToken });
      },

      setUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      logout: () => {
        set({
          token: '',
          refreshToken: '',
          user: null,
          isLoggedIn: false,
        });
      },
    }),
    {
      name: 'login-storage',
    }
  )
);
