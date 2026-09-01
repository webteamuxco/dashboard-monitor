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
// useActiveProject, so the server render and the first client render both start
// from `null` (falling back to the server-resolved initial project). This keeps
// the prefetched query keys matching during hydration.
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