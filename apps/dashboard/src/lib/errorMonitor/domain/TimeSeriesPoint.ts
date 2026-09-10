import type { PeriodInterval } from "@/lib/shared/domain/Period";

export interface TimeSeriesPoint {
  timestamp: string;
  count: number;
}

/**
 * The granularity a provider actually served, which is not always the one the
 * period asked for: an environment-scoped series is read per issue, and that
 * endpoint only exposes hourly and daily buckets. Whoever labels the points
 * reads it here rather than assuming the requested interval.
 */
export interface ErrorStatsSeries {
  interval: PeriodInterval;
  points: TimeSeriesPoint[];
}
