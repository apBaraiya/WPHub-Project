import { create } from 'zustand';
import { User, UserProfile } from '@wphub/types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, profile?: UserProfile | null) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

// Load cached non-sensitive parameters from localStorage for instant boot
const cachedUser = localStorage.getItem('wphub_user');
const cachedProfile = localStorage.getItem('wphub_profile');
const cachedIsAuthenticated = localStorage.getItem('wphub_is_authenticated') === 'true';

export const useAuthStore = create<AuthState>((set) => ({
  user: cachedUser ? JSON.parse(cachedUser) : null,
  profile: cachedProfile ? JSON.parse(cachedProfile) : null,
  accessToken: null,
  isAuthenticated: cachedIsAuthenticated,
  isLoading: cachedIsAuthenticated, // if they were logged in, wait until silent token refresh verifies
  setAuth: (user, accessToken, profile = null) => {
    localStorage.setItem('wphub_user', JSON.stringify(user));
    if (profile) {
      localStorage.setItem('wphub_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('wphub_profile');
    }
    localStorage.setItem('wphub_is_authenticated', 'true');

    set({
      user,
      accessToken,
      profile,
      isAuthenticated: true,
      isLoading: false,
    });
  },
  clearAuth: () => {
    localStorage.removeItem('wphub_user');
    localStorage.removeItem('wphub_profile');
    localStorage.removeItem('wphub_is_authenticated');

    set({
      user: null,
      accessToken: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
