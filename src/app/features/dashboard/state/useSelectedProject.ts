"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SelectedProjectStore {
  documentId: string | null;
  setDocumentId: (documentId: string) => void;
}

// skipHydration: the persisted value is applied on the client after mount by
// useActiveProject, so the server render and the first client render both start
// from `null` (falling back to the server-resolved initial project). This keeps
// the prefetched query keys matching during hydration.
export const useSelectedProject = create<SelectedProjectStore>()(
  persist(
    (set) => ({
      documentId: null,
      setDocumentId: (documentId) => set({ documentId }),
    }),
    {
      name: "dashboard-selected-project",
      skipHydration: true,
    },
  ),
);
