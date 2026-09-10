"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/app/features/dashboard/ui/EmptyState";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  chartAxisTick,
} from "@/components/ui/chart";
import { Level } from "@/lib/config/domain/Level";
import { SeriesBlockMeasure } from "../../../domain/BlockMeasure";
import { useSeriesChart } from "../useSeriesChart";

export function BlockRate({
  measure,
  level,
}: {
  measure: SeriesBlockMeasure;
  level: Level;
}) {
  const { rows, config, ticks, labelOf } = useSeriesChart(measure, level);

  if (rows.length === 0) {
    return <EmptyState>Aucune donnée</EmptyState>;
  }

  return (
    <div className="relative min-h-0 flex-1 p-3.5">
      <ChartContainer config={config}>
        <AreaChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            {measure.series.map((series) => (
              <linearGradient
                key={series.key}
                id={`blockFill-${series.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={`var(--color-${series.key})`}
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor={`var(--color-${series.key})`}
                  stopOpacity={0.02}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="bucketEpoch"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={labelOf}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
            tick={chartAxisTick}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
            tick={chartAxisTick}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
            content={<ChartTooltipContent labelKey="label" />}
          />
          {measure.series.map((series) => (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              stroke={`var(--color-${series.key})`}
              strokeWidth={1.5}
              fill={`url(#blockFill-${series.key})`}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
