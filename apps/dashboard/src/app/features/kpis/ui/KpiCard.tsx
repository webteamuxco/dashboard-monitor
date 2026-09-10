"use client"


import { DashboardKpi, isWindowedKpi } from "@/lib/config/domain/DashboardKpi";
import { Level } from "@/lib/config/domain/Level";
import { cn } from "@/lib/utils";
import { createElement } from "react";
import { getLucideIcon } from "../../utils/lucidIcon";
import { useKpi } from "../hooks/useKpi";
import { useDashboardWindow } from "../../dashboard/state/useDashboardWindow";
import { useEnvironment } from "../../dashboard/state/useEnvironment";

type KpiAccent = Level;

const ACCENT_BAR: Record<KpiAccent, string> = {
  emergency: "bg-level-emergency",
  alert: "bg-level-alert",
  critical: "bg-level-critical",
  error: "bg-level-fatal",
  warning: "bg-level-warning",
  notice: "bg-status-live",
  info: "bg-primary",
  international: "bg-level-international",
  debug: "bg-level-debug",
  trace: "bg-level-trace"
};

const ACCENT_VALUE: Record<KpiAccent, string> = {
  emergency: "text-level-emergency",
  alert: "text-level-alert",
  critical: "text-level-critical",
  error: "text-level-fatal",
  warning: "text-level-warning",
  notice: "text-status-live",
  info: "text-primary",
  international: "text-level-international",
  debug: "text-level-debug",
  trace: "text-level-trace"
};

interface KpiCardProps {
  dashboardKpi: DashboardKpi;
  intervalMs: number;
}

export function KpiCard({ dashboardKpi, intervalMs }: KpiCardProps) {

  // Selecting `null` for an unwindowed KPI rather than filtering afterwards:
  // the store then has nothing to notify this card about, so changing preset
  // neither re-renders it nor invalidates its query key.
  const windowMinutes = useDashboardWindow((s) =>
    isWindowedKpi(dashboardKpi.type) ? s.windowMinutes : null,
  );
  const environment = useEnvironment((s) => s.environment);

  const { data, isPending, isError } = useKpi(
    dashboardKpi.id,
    windowMinutes,
    environment,
    intervalMs,
  );

  const value = isError ? "!" : isPending && !data ? "—" : data.value;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card px-4 py-3.5 w-[stretch]">
      <div className={cn("absolute inset-x-0 top-0 h-0.5", ACCENT_BAR[dashboardKpi.level])} aria-hidden />
      <div className="flex gap-2.5 mb-1.5 font-bold font-mono text-[0.8rem] tracking-wider text-muted-foreground">
        {createElement(getLucideIcon(dashboardKpi.icon), {
          className: "h-4 w-4",
        })}
        {dashboardKpi.title}
      </div>
      <div className={cn("font-mono text-3xl font-semibold leading-none", ACCENT_VALUE[dashboardKpi.level])}>
        {value}
      </div>
      <div className="mt-1 font-mono font-bold text-[0.725rem] text-muted-foreground/60">{dashboardKpi.description}</div>
    </div>
  );
}
