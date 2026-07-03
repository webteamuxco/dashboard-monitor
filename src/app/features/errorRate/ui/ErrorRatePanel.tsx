"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  chartAxisTick,
  type ChartConfig,
} from "@/components/ui/chart";
import { useErrorRate } from "../hooks/useErrorRate";
import { useEnvironment } from "@/app/features/dashboard/state/useEnvironment";

interface ErrorRatePanelProps {
  projectId: string;
  intervalMs: number;
}

const config = {
  count: { label: "Erreurs", color: "var(--level-fatal)" },
} satisfies ChartConfig;

export function ErrorRatePanel({ projectId, intervalMs }: ErrorRatePanelProps) {
  const environment = useEnvironment((s) => s.environment);
  const { data, isPending, isError, error, isFetching } = useErrorRate(
    projectId,
    environment,
    intervalMs,
  );

  const showBackgroundDot = isFetching && !isPending;

  const labelByEpoch = useMemo(() => {
    const map = new Map<number, string>();
    data?.forEach((p) => map.set(p.bucketEpoch, p.label));
    return map;
  }, [data]);

  const ticks = useMemo(() => data?.map((p) => p.bucketEpoch) ?? [], [data]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          Taux d&apos;erreurs
        </CardTitle>
        <div className="flex items-center gap-2">
          {showBackgroundDot && (
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-level-fatal"
              aria-label="Mise à jour en cours"
            />
          )}
          <span className="font-mono text-[0.625rem] text-muted-foreground/60">
            erreurs / h · 24h
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="relative h-full">
          {isPending ? (
            <PanelMessage>Chargement…</PanelMessage>
          ) : isError ? (
            <PanelMessage tone="error">
              {error instanceof Error ? error.message : "Erreur de chargement"}
            </PanelMessage>
          ) : (
            <ChartContainer config={config}>
              <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="errorRateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="bucketEpoch"
                  domain={["dataMin", "dataMax"]}
                  ticks={ticks}
                  tickFormatter={(epoch: number) => labelByEpoch.get(epoch) ?? ""}
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
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={1.5}
                  fill="url(#errorRateFill)"
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PanelMessage({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <div
      className={`flex h-full items-center justify-center font-mono text-[0.6875rem] ${
        tone === "error" ? "text-level-fatal" : "text-muted-foreground/60"
      }`}
    >
      {children}
    </div>
  );
}
