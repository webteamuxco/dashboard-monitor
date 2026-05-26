"use client";

import { boolean } from "zod";
import { create } from "zustand";

export const WINDOW_PRESETS = [
  { minutes: 30, label: "30m" },
  { minutes: 60, label: "1h" },
  { minutes: 180, label: "3h" },
] as const;

export type WindowPreset = (typeof WINDOW_PRESETS)[number];

export type Interactivity = boolean;

function readDefaultFromEnv(): number {
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_RESERVATIONS_WINDOW_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 30;
}

interface DashboardWindowStore {
  windowMinutes: number;
  setWindowMinutes: (minutes: number) => void;
}

export const useDashboardWindow = create<DashboardWindowStore>((set) => ({
  windowMinutes: readDefaultFromEnv(),
  setWindowMinutes: (minutes) => set({ windowMinutes: minutes }),
}));

export function isDashboardInteractive(): boolean {
    const envVar = process.env.NEXT_PUBLIC_DASHBOARD_INTERACTIVITY
    const isBoolean = Boolean(envVar)

    if (!isBoolean) {
      return false
    }

    return envVar === 'true' ? true : false
}