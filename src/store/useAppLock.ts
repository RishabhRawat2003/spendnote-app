import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { create } from 'zustand';

const STORAGE_KEY = 'spendnote.appLock';

/** How long the app may sit in the background before it locks again. */
export const LOCK_TIMEOUT_OPTIONS = [
  { ms: 0, label: 'Immediately' },
  { ms: 30_000, label: '30 sec' },
  { ms: 60_000, label: '1 min' },
  { ms: 5 * 60_000, label: '5 min' },
] as const;

interface StoredLock {
  enabled: boolean;
  timeoutMs: number;
}

interface AppLockState extends StoredLock {
  /** False until the saved preference has been read at launch. */
  hydrated: boolean;
  locked: boolean;
  authenticating: boolean;
  hydrate: () => Promise<void>;
  /** Asks for fingerprint/face/PIN. Resolves true when verified. */
  unlock: () => Promise<boolean>;
  /** Verifies once before turning on, so nobody gets locked out by a missing screen lock. */
  enable: () => Promise<{ ok: true } | { ok: false; reason: string }>;
  disable: () => void;
  setTimeoutMs: (timeoutMs: number) => void;
}

function persist({ enabled, timeoutMs }: StoredLock) {
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ enabled, timeoutMs })).catch(() => {});
}

export const useAppLock = create<AppLockState>((set, get) => {
  const authenticate = async (promptMessage: string) => {
    set({ authenticating: true });
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        promptSubtitle: 'Use your fingerprint, face or screen lock',
        cancelLabel: 'Cancel',
      });
      return result.success;
    } finally {
      set({ authenticating: false });
    }
  };

  return {
    enabled: false,
    timeoutMs: 60_000,
    hydrated: false,
    locked: false,
    authenticating: false,

    hydrate: async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        const stored = raw ? (JSON.parse(raw) as Partial<StoredLock>) : {};
        const enabled = stored.enabled === true;
        set({
          enabled,
          timeoutMs: typeof stored.timeoutMs === 'number' ? stored.timeoutMs : get().timeoutMs,
          locked: enabled,
          hydrated: true,
        });
      } catch {
        set({ hydrated: true });
      }
    },

    unlock: async () => {
      if (get().authenticating) return false;
      const ok = await authenticate('Unlock SpendNote');
      if (ok) set({ locked: false });
      return ok;
    },

    enable: async () => {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        return { ok: false, reason: 'Set up a fingerprint, face unlock or screen lock PIN in your phone’s settings first.' };
      }
      const ok = await authenticate('Confirm to turn on App lock');
      if (!ok) return { ok: false, reason: 'Verification was cancelled, so App lock is still off.' };
      set({ enabled: true });
      persist(get());
      return { ok: true };
    },

    disable: () => {
      set({ enabled: false, locked: false });
      persist(get());
    },

    setTimeoutMs: (timeoutMs) => {
      set({ timeoutMs });
      persist(get());
    },
  };
});

let backgroundedAt: number | null = null;

AppState.addEventListener('change', (state) => {
  const lock = useAppLock.getState();
  // The system biometric prompt can briefly background the app; that must not re-lock it.
  if (lock.authenticating) return;
  if (state === 'background') {
    backgroundedAt = Date.now();
  } else if (state === 'active' && backgroundedAt !== null) {
    const away = Date.now() - backgroundedAt;
    backgroundedAt = null;
    if (lock.enabled && away >= lock.timeoutMs) useAppLock.setState({ locked: true });
  }
});
