import type { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";
import type { PeriodInterval } from "@/lib/shared/domain/Period";

export type BlockMeasure = SeriesBlockMeasure | ListBlockMeasure;

/**
 * The per-family knobs of a block measure. They travel in one bag rather than
 * as positional arguments because each family reads its own — the strategies
 * are resolved as a union, which a signature differing per family would break.
 */
export interface BlockMeasureOptions {
  tagId?: string | null;
  showResolved?: boolean;
}

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
  // Only the error family has a resolution status: a log line has nothing to
  // declare here, so the flag is absent rather than false.
  isResolved?: boolean;
}

export interface Buckets {
  interval: PeriodInterval;
  sizeMs: number;
}