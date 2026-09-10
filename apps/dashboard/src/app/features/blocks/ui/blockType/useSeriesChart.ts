"use client";

import { useCallback, useMemo } from "react";
import {
  ACCENT_CHART,
  SECONDARY_SERIES_COLORS,
} from "@/app/features/utils/accent";
import type { ChartConfig } from "@/components/ui/chart";
import type { Level } from "@/lib/config/domain/Level";
import type { SeriesBlockMeasure } from "../../domain/BlockMeasure";

export interface SeriesChartRow {
  [seriesKey: string]: number | string | null;
  bucketEpoch: number;
  label: string;
}

export interface SeriesChart {
  rows: SeriesChartRow[];
  config: ChartConfig;
  ticks: number[];
  labelOf: (bucketEpoch: number) => string;
}

export function useSeriesChart(
  measure: SeriesBlockMeasure,
  level: Level,
): SeriesChart {
  const rows = useMemo<SeriesChartRow[]>(() => {
    const byEpoch = new Map<number, SeriesChartRow>();

    for (const series of measure.series) {
      for (const point of series.points) {
        const row = byEpoch.get(point.bucketEpoch) ?? {
          bucketEpoch: point.bucketEpoch,
          label: point.label,
        };
        row[series.key] = point.count;
        byEpoch.set(point.bucketEpoch, row);
      }
    }

    return [...byEpoch.values()].sort((a, b) => a.bucketEpoch - b.bucketEpoch);
  }, [measure]);

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        measure.series.map((series, index) => [
          series.key,
          {
            label: series.label,
            color:
              index === 0
                ? ACCENT_CHART[level]
                : SECONDARY_SERIES_COLORS[
                    (index - 1) % SECONDARY_SERIES_COLORS.length
                  ],
          },
        ]),
      ),
    [measure, level],
  );

  const labelByEpoch = useMemo(
    () =>
      new Map<number, string>(rows.map((row) => [row.bucketEpoch, row.label])),
    [rows],
  );

  const labelOf = useCallback(
    (bucketEpoch: number) => labelByEpoch.get(bucketEpoch) ?? "",
    [labelByEpoch],
  );

  const ticks = useMemo(() => rows.map((row) => row.bucketEpoch), [rows]);

  return { rows, config, ticks, labelOf };
}
