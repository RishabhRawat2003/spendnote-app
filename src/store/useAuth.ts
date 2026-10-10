import { create } from 'zustand';

import { api, session, setUnauthorizedHandler, type ApiUser } from '@/lib/api';
import { clearUserData, loadUserData } from '@/lib/sync';

import { useAppLock } from './useAppLock';

export type User = ApiUser;

/** `restoring` while the saved session is read from secure storage at launch. */
type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  restore: () => Promise<void>;
  /** Throws an ApiError with a user-facing message on failure. */
  logIn: (email: string, password: string) => Promise<void>;
  /** Throws an ApiError with a user-facing message on failure. */
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => {
  const startSession = async (token: string, user: User) => {
    await session.save({ token, user });
    // Just typed their password, so don't ask for a fingerprint on top.
    useAppLock.setState({ locked: false });
    set({ status: 'signedIn', user });
    loadUserData().catch(() => {});
  };

  return {
    status: 'restoring',
    user: null,

    restore: async () => {
      const stored = await session.load();
      if (!stored) {
        set({ status: 'signedOut' });
        return;
      }
      // Use the cached profile right away so the app opens even when offline; the data load refreshes it.
      set({ status: 'signedIn', user: stored.user });
      loadUserData().catch(() => {});
    },

    logIn: async (email, password) => {
      const { token, user } = await api.logIn(email.trim(), password);
      await startSession(token, user);
    },

    signUp: async (name, email, password) => {
      const { token, user } = await api.signUp(name.trim(), email.trim(), password);
      await startSession(token, user);
    },

    logOut: async () => {
      if (get().status === 'signedOut') return;
      await session.clear();
      clearUserData();
      set({ status: 'signedOut', user: null });
    },
  };
});

setUnauthorizedHandler(() => void useAuth.getState().logOut());
