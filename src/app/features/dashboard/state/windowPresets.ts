import { TimeInterval } from "@/lib/config/domain/TimeInterval";
import { ALLOWED_INTERVAL } from "@/lib/config/domain/dto/StrapiProject";

export const DEFAULT_WINDOW_PRESETS = [
  { minutes: 30, label: "30m" },
  { minutes: 60, label: "1h" },
  { minutes: 720, label: "12h" },
  { minutes: 1440, label: "24h" },
] as const;

export interface WindowPreset {
  minutes: number;
  label: string;
}

export interface ResolvedWindow {
  presets: WindowPreset[];
  initialWindowMinutes: number;
}

export function formatWindowLabel(minutes: number): string {
  if (minutes > 1440 && minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes < 60) return `${minutes}m`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

export function readDefaultWindowMinutesFromEnv(): number {
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_RESERVATIONS_WINDOW_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 30;
}

const INTERVAL_TO_MINUTES: Record<ALLOWED_INTERVAL, number> = {
  seconds: 1 / 60,
  minutes: 1,
  hours: 60,
  days: 1440,
};

function timeIntervalToMinutes(interval: TimeInterval): number {
  return Math.round(interval.duration * INTERVAL_TO_MINUTES[interval.interval]);
}

export function presetsFromTimeInterval(
  timeInterval?: TimeInterval[] | null,
): ResolvedWindow {
  const presets = (timeInterval ?? [])
    .map(timeIntervalToMinutes)
    .filter((minutes) => minutes > 0)
    .map((minutes) => ({ minutes, label: formatWindowLabel(minutes) }));

  if (presets.length === 0) {
    return {
      presets: [...DEFAULT_WINDOW_PRESETS],
      initialWindowMinutes: readDefaultWindowMinutesFromEnv(),
    };
  }

  return { presets, initialWindowMinutes: presets[0].minutes };
}
