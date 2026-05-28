"use client";

import { Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  chartAxisTick,
  type ChartConfig,
} from "@/components/ui/chart";
import { useDashboardWindow } from "@/app/features/dashboard/state/useDashboardWindow";
import { useVisitorsTimeline } from "../hooks/useVisitorsTimeline";

interface VisitorsPanelProps {
  projectId: string;
  intervalMs: number;
}

const config = {
  newCount: { label: "Nouveaux", color: "#3fb950" },
  returningCount: { label: "De retour", color: "#388bfd" },
} satisfies ChartConfig;

export function VisitorsPanel({ projectId, intervalMs }: VisitorsPanelProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const { data, isPending, isError, error, isFetching } = useVisitorsTimeline(
    projectId,
    windowMinutes,
    intervalMs,
  );

  const showBackgroundDot = isFetching && !isPending;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          Visiteurs en temps réel
        </CardTitle>
        <div className="flex items-center gap-2">
          {showBackgroundDot && (
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-live"
              aria-label="Mise à jour en cours"
            />
          )}
          <span className="font-mono text-[0.625rem] text-muted-foreground/60">
            nouveaux + de retour / min
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
              <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
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
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.15 }}
                  content={<ChartTooltipContent labelKey="label" />}
                />
                <Legend
                  verticalAlign="top"
                  height={20}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) =>
                    value === "newCount" ? "Nouveaux" : "De retour"
                  }
                  wrapperStyle={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.625rem",
                    color: "var(--muted-foreground)",
                  }}
                />
                <Bar
                  dataKey="newCount"
                  stackId="visitors"
                  fill="var(--color-newCount)"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="returningCount"
                  stackId="visitors"
                  fill="var(--color-returningCount)"
                  isAnimationActive={false}
                />
              </BarChart>
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
