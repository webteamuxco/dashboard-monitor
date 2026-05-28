import type { TimeSeriesPoint } from "@/lib/errorMonitor/domain/TimeSeriesPoint";
import type { GlitchTipStatsV2Dto } from "../dto/GlitchTipStatsV2";

const FIELD = "sum(quantity)";

export function mapGlitchTipStatsV2(dto: GlitchTipStatsV2Dto): TimeSeriesPoint[] {
  const intervals = dto.intervals ?? [];
  const series = dto.groups?.[0]?.series?.[FIELD] ?? [];

  return intervals.map((timestamp, i) => ({
    timestamp,
    count: series[i] ?? 0,
  }));
}
