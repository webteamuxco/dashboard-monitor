"use client";

import { create } from "zustand";
import {
  DEFAULT_WINDOW_PRESETS,
  WindowPreset,
  readDefaultWindowMinutesFromEnv,
} from "./windowPresets";

export { formatWindowLabel } from "./windowPresets";
export type { WindowPreset } from "./windowPresets";

export type Interactivity = boolean;

interface DashboardWindowStore {
  presets: WindowPreset[];
  windowMinutes: number;
  setWindowMinutes: (minutes: number) => void;
  hydrateFromStrapi: (presets: WindowPreset[], windowMinutes: number) => void;
}

export const useDashboardWindow = create<DashboardWindowStore>((set) => ({
  presets: [...DEFAULT_WINDOW_PRESETS],
  windowMinutes: readDefaultWindowMinutesFromEnv(),
  setWindowMinutes: (minutes) => set({ windowMinutes: minutes }),
  hydrateFromStrapi: (presets, windowMinutes) => set({ presets, windowMinutes }),
}));

export function isDashboardInteractive(): boolean {
  const envVar = process.env.NEXT_PUBLIC_DASHBOARD_INTERACTIVITY;
  const isBoolean = Boolean(envVar);

  if (!isBoolean) {
    return false;
  }

  return envVar === "true" ? true : false;
}
