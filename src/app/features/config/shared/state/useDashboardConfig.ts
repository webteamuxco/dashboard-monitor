"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getDefaultDashboardConfig,
  type DashboardConfig,
  type MonitoringTool,
} from "../domain/DashboardConfig";

interface DashboardConfigStore {
  config: DashboardConfig;
  isPanelOpen: boolean;
  setLogTool: (tool: MonitoringTool | null) => void;
  setErrorTool: (tool: MonitoringTool | null) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

export const useDashboardConfig = create<DashboardConfigStore>()(
  persist(
    (set) => ({
      config: getDefaultDashboardConfig(),
      isPanelOpen: false,
      setLogTool: (tool) =>
        set((s) => ({ config: { ...s.config, selectedLogTool: tool } })),
      setErrorTool: (tool) =>
        set((s) => ({ config: { ...s.config, selectedErrorTool: tool } })),
      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),
      togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
    }),
    {
      name: "dashboard-config",
      partialize: (state) => ({ config: state.config }),
    },
  ),
);
