import { create } from 'zustand';

import { api } from '@/lib/api';
import { reportSyncError } from '@/lib/syncErrors';
import type { Settings, ThemePreference } from '@/types';

interface SettingsState extends Settings {
  /** Replaces local settings with the server's copy. */
  hydrate: (settings: Settings) => void;
  reset: () => void;
  setTheme: (theme: ThemePreference) => void;
  setMinPromptAmount: (paise: number) => void;
  setAutoDetect: (autoDetect: boolean) => void;
}

const DEFAULTS: Settings = { theme: 'system', minPromptAmount: 50 * 100, autoDetect: true };

export const useSettings = create<SettingsState>((set, get) => {
  /** Applies the change straight away, then saves it; rolls back if the server refuses. */
  const change = (patch: Partial<Settings>) => {
    const previous: Settings = { theme: get().theme, minPromptAmount: get().minPromptAmount, autoDetect: get().autoDetect };
    set(patch);
    api.settings.update(patch).catch((err) => {
      set(previous);
      reportSyncError(err, 'Couldn’t save your settings');
    });
  };

  return {
    ...DEFAULTS,
    hydrate: (settings) => set({ theme: settings.theme, minPromptAmount: settings.minPromptAmount, autoDetect: settings.autoDetect }),
    reset: () => set(DEFAULTS),
    setTheme: (theme) => change({ theme }),
    setMinPromptAmount: (minPromptAmount) => change({ minPromptAmount }),
    setAutoDetect: (autoDetect) => change({ autoDetect }),
  };
});
