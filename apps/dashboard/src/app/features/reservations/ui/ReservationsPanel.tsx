"use client";

import { CalendarCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  chartAxisTick,
  type ChartConfig,
} from "@/components/ui/chart";
import { useDashboardWindow } from "@/app/features/dashboard/state/useDashboardWindow";
import { useReservations } from "../hooks/useReservations";

interface ReservationsPanelProps {
  projectId: string;
  intervalMs: number;
}

const config = {
  count: { label: "Réservations", color: "var(--primary)" },
} satisfies ChartConfig;

export function ReservationsPanel({ projectId, intervalMs }: ReservationsPanelProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const { data, isPending, isError, error, isFetching } = useReservations(
    projectId,
    windowMinutes,
    intervalMs,
  );

  const showBackgroundDot = isFetching && !isPending;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
          Réservations envoyées
        </CardTitle>
        <div className="flex items-center gap-2">
          {showBackgroundDot && (
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
              aria-label="Mise à jour en cours"
            />
          )}
          <span className="font-mono text-[0.625rem] text-muted-foreground/60">req / min</span>
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
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={<ChartTooltipContent labelKey="label" />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={24}
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
