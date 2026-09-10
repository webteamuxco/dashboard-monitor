"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

const STACK_ID = "series";

interface BlockBarProps {
  measure: SeriesBlockMeasure;
  level: Level;
  stacked?: boolean;
}

export function BlockBar({ measure, level, stacked = false }: BlockBarProps) {
  const { rows, config, labelOf } = useSeriesChart(measure, level);

  if (rows.length === 0) {
    return <EmptyState>Aucune donnée</EmptyState>;
  }

  return (
    <div className="relative min-h-0 flex-1 p-3.5">
      <ChartContainer config={config}>
        <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            type="category"
            dataKey="bucketEpoch"
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
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={<ChartTooltipContent labelKey="label" />}
          />
          {measure.series.map((series, index) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              fill={`var(--color-${series.key})`}
              stackId={stacked ? STACK_ID : undefined}
              radius={
                !stacked || index === measure.series.length - 1
                  ? [2, 2, 0, 0]
                  : 0
              }
              maxBarSize={24}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function StackedBlockBar(props: Omit<BlockBarProps, "stacked">) {
  return <BlockBar {...props} stacked />;
}
