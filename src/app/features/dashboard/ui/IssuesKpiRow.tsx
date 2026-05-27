"use client";

import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { ReservationsKpiCard } from "@/app/features/reservations/ui/ReservationsKpiCard";
import { VisitorsKpiCard } from "@/app/features/visitors/ui/VisitorsKpiCard";
import { KpiCard } from "./KpiCard";
import {
  formatWindowLabel,
  useDashboardWindow,
} from "../state/useDashboardWindow";

interface IssuesKpiRowProps {
  projectId: string;
  limit: number;
  intervalMs: number;
}

export function IssuesKpiRow({ projectId, limit, intervalMs }: IssuesKpiRowProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const { data, isPending, dataUpdatedAt } = useIssues(projectId, limit, intervalMs);

  const total = data?.length ?? 0;
  const windowStart = (dataUpdatedAt || 0) - windowMinutes * 60_000;
  const newCount =
    data?.filter((row) => new Date(row.lastSeenIso).getTime() > windowStart).length ?? 0;

  const display = (n: number) => (isPending && !data ? "—" : n);
  const windowLabel = formatWindowLabel(windowMinutes);

  return (
    <div className="grid grid-cols-5 gap-2.5">
      <KpiCard
        label="ISSUES OUVERTES"
        value={display(total)}
        subtitle="total non résolues"
        accent="red"
      />
      <KpiCard
        label={`NOUVELLES (${windowLabel.toUpperCase()})`}
        value={display(newCount)}
        subtitle={`fenêtre ${windowLabel}`}
        accent="orange"
      />
      <VisitorsKpiCard
        projectId={projectId}
        intervalMs={intervalMs}
        variant="new"
      />
      <VisitorsKpiCard
        projectId={projectId}
        intervalMs={intervalMs}
        variant="returning"
      />
      <ReservationsKpiCard projectId={projectId} intervalMs={intervalMs} />
    </div>
  );
}
