import { create } from 'zustand';

interface AppUIState {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppUIState>((set) => ({
  darkMode: false,
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      document.documentElement.classList.toggle('dark', next);
      return { darkMode: next };
    }),
}));
