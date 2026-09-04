"use client";

import { create } from "zustand";

interface EnvironmentStore {
  environment: string | null;
  setEnvironment: (environment: string | null) => void;
}

export const useEnvironment = create<EnvironmentStore>((set) => ({
  environment: null,
  setEnvironment: (environment) => set({ environment }),
}));
