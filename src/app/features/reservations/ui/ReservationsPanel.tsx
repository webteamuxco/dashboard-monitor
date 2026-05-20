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
  type ChartConfig,
} from "@/components/ui/chart";
import { useDashboardWindow } from "@/app/features/dashboard/state/useDashboardWindow";
import { useReservations } from "../hooks/useReservations";

interface ReservationsPanelProps {
  projectId: string;
  intervalMs: number;
  height?: number;
}

const config = {
  count: { label: "Réservations", color: "var(--primary)" },
} satisfies ChartConfig;

export function ReservationsPanel({ projectId, intervalMs, height = 200 }: ReservationsPanelProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const { data, isPending, isError, error, isFetching } = useReservations(
    projectId,
    windowMinutes,
    intervalMs,
  );

  const showBackgroundDot = isFetching && !isPending;

  return (
    <Card>
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
          <span className="font-mono text-[10px] text-muted-foreground/60">req / min</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          {isPending ? (
            <PanelMessage>Chargement…</PanelMessage>
          ) : isError ? (
            <PanelMessage tone="error">
              {error instanceof Error ? error.message : "Erreur de chargement"}
            </PanelMessage>
          ) : (
            <ChartContainer config={config}>
              <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                  tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
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
      className={`flex h-full items-center justify-center font-mono text-[11px] ${
        tone === "error" ? "text-level-fatal" : "text-muted-foreground/60"
      }`}
    >
      {children}
    </div>
  );
}
