"use client";

import * as React from "react";
import { Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

export const chartAxisTick = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 600,
  fill: "var(--foreground)",
  fillOpacity: 0.65,
} as const;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChartConfig() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("ChartTooltipContent must be used inside ChartContainer");
  return ctx.config;
}

interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig;
  children: React.ReactElement;
}

export function ChartContainer({ config, className, children, ...rest }: ChartContainerProps) {
  const styleVars = Object.fromEntries(
    Object.entries(config).map(([key, { color }]) => [`--color-${key}`, color]),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "h-full w-full [&_.recharts-cartesian-grid_line]:stroke-border/40",
          className,
        )}
        style={styleVars}
        {...rest}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsTooltip;

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: Record<string, unknown> }>;
  label?: string;
  labelKey?: string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelKey,
}: ChartTooltipContentProps) {
  const config = useChartConfig();

  if (!active || !payload?.length) return null;

  const displayLabel = labelKey && payload[0]
    ? String(payload[0].payload[labelKey] ?? label ?? "")
    : (label ?? "");

  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 font-mono text-[0.6875rem] shadow-md">
      <div className="mb-1 text-muted-foreground">{displayLabel}</div>
      {payload.map((entry) => {
        const cfg = config[entry.dataKey];
        return (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: cfg?.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{cfg?.label ?? entry.dataKey}</span>
            <span className="ml-auto tabular-nums text-foreground">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}
