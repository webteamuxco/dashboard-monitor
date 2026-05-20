"use client";

import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { ReservationsKpiCard } from "@/app/features/reservations/ui/ReservationsKpiCard";
import { VisitorsKpiCard } from "@/app/features/visitors/ui/VisitorsKpiCard";
import { KpiCard } from "./KpiCard";
import {
  formatWindowLabel,
  useDashboardWindow,
} from "../state/useDashboardWindow";
import { useEnvironment } from "../state/useEnvironment";

interface IssuesKpiRowProps {
  documentId: string;
  limit: number;
  intervalMs: number;
}

export function IssuesKpiRow({ documentId, limit, intervalMs }: IssuesKpiRowProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const environment = useEnvironment((s) => s.environment);
  const { data, isPending, dataUpdatedAt } = useIssues(
    documentId,
    limit,
    environment,
    intervalMs,
  );

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
        documentId={documentId}
        intervalMs={intervalMs}
        variant="new"
      />
      <VisitorsKpiCard
        documentId={documentId}
        intervalMs={intervalMs}
        variant="returning"
      />
      <ReservationsKpiCard documentId={documentId} intervalMs={intervalMs} />
    </div>
  );
}
