import type { TimeSeriesPoint } from "@/lib/errorMonitor/domain/TimeSeriesPoint";
import type { GlitchTipListEventDto } from "../dto/GlitchTipEvent";

export interface SeriesWindow {
  fromMs: number;
  toMs: number;
  bucketMs: number;
}

function floorToBucket(ms: number, bucketMs: number): number {
  return Math.floor(ms / bucketMs) * bucketMs;
}

function eventEnvironment(dto: GlitchTipListEventDto): string | undefined {
  return dto.tags?.find((tag) => tag.key === "environment")?.value;
}

// Buckets raw events by their own timestamp, zero-filled across the window: a
// bucket with no event is a bucket with no error, and the chart needs it to keep
// a continuous time axis.
//
// `environment` narrows on each event's own tag — the only per-event source
// GlitchTip exposes. Counting a whole issue towards every environment it has
// ever been seen in is what made the series read several times the real volume.
export function mapGlitchTipEventSeries(
  events: GlitchTipListEventDto[],
  window: SeriesWindow,
  environment?: string,
): TimeSeriesPoint[] {
  const buckets = new Map<number, number>();
  for (
    let t = floorToBucket(window.fromMs, window.bucketMs);
    t <= window.toMs;
    t += window.bucketMs
  ) {
    buckets.set(t, 0);
  }

  for (const event of events) {
    if (environment && eventEnvironment(event) !== environment) continue;

    const at = Date.parse(event.date_created);
    if (Number.isNaN(at) || at < window.fromMs || at > window.toMs) continue;

    const bucket = floorToBucket(at, window.bucketMs);
    if (!buckets.has(bucket)) continue;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  return Array.from(buckets, ([epoch, count]) => ({
    timestamp: new Date(epoch).toISOString(),
    count,
  }));
}
