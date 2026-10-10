import { create } from 'zustand';

export interface User {
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  /** Demo only: accepts any input until the backend exists. */
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logOut: () => void;
}

const FAKE_DELAY_MS = 600;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (!local) return 'Friend';
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const useAuth = create<AuthState>((set) => ({
  user: null,

  logIn: async (email) => {
    await wait(FAKE_DELAY_MS);
    const trimmed = email.trim();
    set({ user: { name: nameFromEmail(trimmed), email: trimmed || 'demo@spendnote.app' } });
  },

  signUp: async (name, email) => {
    await wait(FAKE_DELAY_MS);
    const trimmedEmail = email.trim();
    set({
      user: {
        name: name.trim() || nameFromEmail(trimmedEmail),
        email: trimmedEmail || 'demo@spendnote.app',
      },
    });
  },

  logOut: () => set({ user: null }),
}));
