import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PublicUser } from '@guardian/shared';

interface AuthState {
  accessToken: string | null;
  user: PublicUser | null;
  setAuth: (token: string, user: PublicUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    { name: 'guardian-auth', partialize: (s) => ({ accessToken: s.accessToken, user: s.user }) }
  )
);
