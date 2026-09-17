import { BlockSeriesPoint, Buckets } from "../domain/BlockMeasure";
import { Period, PeriodInterval } from "../domain/Period";


export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const DEFAULT_LIST_LIMIT = 20;
export const DISPLAY_TIMEZONE = "Europe/Paris";

export const INTERVAL_SIZE_MS: Record<PeriodInterval, number> = {
  "1m": MINUTE_MS,
  "5m": 5 * MINUTE_MS,
  "15m": 15 * MINUTE_MS,
  "1h": HOUR_MS,
  "1d": DAY_MS,
};

export const hourLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: DISPLAY_TIMEZONE,
});

export const minuteLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: DISPLAY_TIMEZONE,
});

export const dayLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: DISPLAY_TIMEZONE,
});

export const relativeFormatter = new Intl.RelativeTimeFormat("fr", {
  numeric: "auto",
});

export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return relativeFormatter.format(diffSec, "second");
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSec / 3600), "hour");
  return relativeFormatter.format(Math.round(diffSec / 86400), "day");
}


export function buildKpiPeriod(windowMinutes: number): Period {
    const now = Date.now();
    // The bucket size does not change the sum, only how many buckets a provider
    // has to return: keep it coarse on wide windows.
    const interval: PeriodInterval = windowMinutes > 120 ? "1h" : "1m";
  
    return {
      from: new Date(now - windowMinutes * MINUTE_MS).toISOString(),
      to: new Date(now).toISOString(),
      interval,
    };
}

export function buildBlockPeriod(
  now: Date,
  windowMinutes: number,
  interval: PeriodInterval,
): Period {
  return {
    from: new Date(now.getTime() - windowMinutes * MINUTE_MS).toISOString(),
    to: now.toISOString(),
    interval,
  };
}


export function formatBucketLabel(date: Date, sizeMs: number): string {
  if (sizeMs < HOUR_MS) {
    return minuteLabelFormatter.format(date);
  }

  if (sizeMs >= DAY_MS) {
    return dayLabelFormatter.format(date);
  }

  const hourPart =
    hourLabelFormatter.formatToParts(date).find((p) => p.type === "hour")
      ?.value ?? "00";

  return `${hourPart}h`;
}

export function toPoint(date: Date, count: number | null, sizeMs: number): BlockSeriesPoint {
  return {
    bucketEpoch: date.getTime(),
    label: formatBucketLabel(date, sizeMs),
    count,
  };
}


// Same threshold as the KPI measure, so a rate block and an interval KPI on
// one panel agree on their buckets.
export function resolveBuckets(windowMinutes: number): Buckets {
  return windowMinutes > 120
    ? { interval: "1h", sizeMs: HOUR_MS }
    : { interval: "1m", sizeMs: MINUTE_MS };
}

/**
 * A provider that returns nothing for a quiet bucket would otherwise leave a
 * gap the chart draws as a straight line between two distant points.
 */
export function buildEmptyBuckets(
  now: Date,
  windowMinutes: number,
  sizeMs: number,
): BlockSeriesPoint[] {
  const count = Math.max(1, Math.ceil((windowMinutes * MINUTE_MS) / sizeMs));
  const lastBucket = Math.floor(now.getTime() / sizeMs);

  return Array.from({ length: count }, (_, i) =>
    toPoint(new Date((lastBucket - count + 1 + i) * sizeMs), 0, sizeMs),
  );
}

export function aggregateByBucket(
  timestamps: string[],
  buckets: BlockSeriesPoint[],
  sizeMs: number,
): BlockSeriesPoint[] {
  const indexByEpoch = new Map(buckets.map((p, i) => [p.bucketEpoch, i]));
  const counts = buckets.map(() => 0);

  for (const timestamp of timestamps) {
    const epoch = Math.floor(new Date(timestamp).getTime() / sizeMs) * sizeMs;
    const index = indexByEpoch.get(epoch);
    if (index !== undefined) counts[index]++;
  }

  return buckets.map((p, i) => ({ ...p, count: counts[i] }));
}
