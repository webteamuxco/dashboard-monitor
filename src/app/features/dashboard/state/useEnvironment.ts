"use client";

import { create } from "zustand";
import { resolveDefaultEnvironment } from "./environments";

interface EnvironmentStore {
  environment: string | null;
  setEnvironment: (environment: string | null) => void;
}

export const useEnvironment = create<EnvironmentStore>((set) => ({
  environment: resolveDefaultEnvironment(),
  setEnvironment: (environment) => set({ environment }),
}));
