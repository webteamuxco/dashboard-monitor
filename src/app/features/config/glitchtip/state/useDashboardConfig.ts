"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getDefaultDashboardConfig,
  type DashboardConfig,
} from "../domain/DashboardConfig";

interface GlitchTipConfigStore {
  config: DashboardConfig;
  setConfig: (next: DashboardConfig) => void;
}

export const useGlitchTipConfig = create<GlitchTipConfigStore>()(
  persist(
    (set) => ({
      config: getDefaultDashboardConfig(),
      setConfig: (next) => set({ config: next }),
    }),
    {
      name: "dashboard-glitchtip-config",
      partialize: (state) => ({ config: state.config }),
    },
  ),
);
