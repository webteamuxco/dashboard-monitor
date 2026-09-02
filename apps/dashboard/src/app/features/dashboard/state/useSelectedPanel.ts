"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SelectedPanelStore {
  panelSlug: string | null;
  panelIcon: string | null;
  pannelId: string;
  setPanelId: (setPanelId: string) => void;
  setPanelSlug: (setPanelSlug: string) => void;
  setPanelIcon: (setPanelIcon: string | null) => void;
}

// skipHydration: the persisted value is applied on the client after mount by
// useActivePanel, so the server render and the first client render both start
// from the empty selection (falling back to the project's first panel by
// `order`, which is the one the server prefetched for).
export const useSelectedPanel = create<SelectedPanelStore>()(
  persist(
    (set) => ({
      panelSlug: null,
      pannelId: "",
      panelIcon: "panels-right-bottom",
      setPanelId: (pannelId) => set({ pannelId }),
      setPanelSlug: (panelSlug) => set({ panelSlug }),
      setPanelIcon: (panelIcon) => set({ panelIcon }),
    }),
    {
      name: "dashboard-selected-pannel",
      skipHydration: true,
    },
  ),
);