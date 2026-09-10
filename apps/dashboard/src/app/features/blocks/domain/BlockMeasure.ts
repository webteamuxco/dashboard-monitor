import type { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";
import type { PeriodInterval } from "@/lib/shared/domain/Period";

export type BlockMeasure = SeriesBlockMeasure | ListBlockMeasure;

/**
 * `interval` is the granularity the points actually carry, which a provider may
 * have coarsened: the card states it so a one-bucket window reads as a
 * limitation rather than as an absence of errors.
 */
export interface SeriesBlockMeasure {
  type: "series";
  series: BlockSeries[];
  windowMinutes: number | null;
  interval: PeriodInterval;
}

export interface ListBlockMeasure {
  type: "list";
  entries: BlockListEntry[];
  hasDetail: boolean;
  windowMinutes: number | null;
}

export interface BlockSeries {
  key: string;
  label: string;
  points: BlockSeriesPoint[];
}

export interface BlockSeriesPoint {
  bucketEpoch: number;
  label: string;
  count: number | null;
}

export interface BlockListEntry {
  id: string;
  title: string;
  subtitle: string | null;
  level: ErrorLevel;
  count: number | null;
  timestampIso: string;
  timestampLabel: string;
}
