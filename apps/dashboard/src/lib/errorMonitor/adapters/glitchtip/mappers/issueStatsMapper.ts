import type { TimeSeriesPoint } from "@/lib/errorMonitor/domain/TimeSeriesPoint";
import type {
  GlitchTipIssueStatsDto,
  GlitchTipStatsPeriod,
} from "../dto/GlitchTipIssueStats";

export interface StatsWindow {
  fromMs: number;
  toMs: number;
  bucketMs: number;
}

function floorToBucket(ms: number, bucketMs: number): number {
  return Math.floor(ms / bucketMs) * bucketMs;
}

// Sums the per-issue buckets into a single series covering the whole window,
// zero-filled: a bucket GlitchTip omitted is a bucket with no error, and the
// chart needs it to keep a continuous time axis.
export function mapGlitchTipIssueStats(
  dtos: GlitchTipIssueStatsDto[],
  statsPeriod: GlitchTipStatsPeriod,
  window: StatsWindow,
): TimeSeriesPoint[] {
  const buckets = new Map<number, number>();
  for (
    let t = floorToBucket(window.fromMs, window.bucketMs);
    t <= window.toMs;
    t += window.bucketMs
  ) {
    buckets.set(t, 0);
  }

  for (const dto of dtos) {
    for (const [epochSeconds, count] of dto.stats?.[statsPeriod] ?? []) {
      const bucket = floorToBucket(epochSeconds * 1000, window.bucketMs);
      if (!buckets.has(bucket)) continue;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + count);
    }
  }

  return Array.from(buckets, ([epoch, count]) => ({
    timestamp: new Date(epoch).toISOString(),
    count,
  }));
}
