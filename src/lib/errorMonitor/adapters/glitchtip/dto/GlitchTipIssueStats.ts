// GlitchTip only exposes two granularities on issues-stats: `24h` (hourly
// buckets) and `14d` (daily buckets). The unrequested one comes back as null.
export type GlitchTipStatsPeriod = "24h" | "14d";

// [epochSeconds, count] — only non-empty buckets are returned.
export type GlitchTipStatsBucket = [number, number];

export interface GlitchTipIssueStatsDto {
  id: string;
  count: string;
  stats: Partial<Record<GlitchTipStatsPeriod, GlitchTipStatsBucket[] | null>>;
}
