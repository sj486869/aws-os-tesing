"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type OSTheme = "system" | "light" | "dark";

type OSSettings = {
  theme: OSTheme;
  accent: string;
  wallpaper: string;
  animationsEnabled: boolean;
};

type OSActions = {
  setTheme: (theme: OSTheme) => void;
  setAccent: (accent: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  resetLocalSettings: () => void;
};

export const DEFAULT_WALLPAPER =
  "radial-gradient(circle at top, #1b2133, #0b0d12 55%, #07080b)";

const DEFAULTS: OSSettings = {
  theme: "system",
  accent: "#3b82f6",
  wallpaper: DEFAULT_WALLPAPER,
  animationsEnabled: true,
};

export const useOSStore = create<OSSettings & OSActions>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      resetLocalSettings: () => set({ ...DEFAULTS }),
    }),
    {
      name: "web-os:settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
