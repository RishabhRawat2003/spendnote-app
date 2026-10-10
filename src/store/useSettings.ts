import { create } from 'zustand';

import type { Settings, ThemePreference } from '@/types';

interface SettingsState extends Settings {
  setTheme: (theme: ThemePreference) => void;
  setMinPromptAmount: (paise: number) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  theme: 'system',
  minPromptAmount: 50 * 100,
  setTheme: (theme) => set({ theme }),
  setMinPromptAmount: (minPromptAmount) => set({ minPromptAmount }),
}));
