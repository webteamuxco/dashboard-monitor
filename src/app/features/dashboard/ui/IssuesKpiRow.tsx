"use client";

import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { ReservationsKpiCard } from "@/app/features/reservations/ui/ReservationsKpiCard";
import { KpiCard } from "./KpiCard";

interface IssuesKpiRowProps {
  projectId: string;
  limit: number;
  intervalMs: number;
}

export function IssuesKpiRow({ projectId, limit, intervalMs }: IssuesKpiRowProps) {
  const { data, isPending, dataUpdatedAt } = useIssues(projectId, limit, intervalMs);

  const total = data?.length ?? 0;
  const oneHourAgo = (dataUpdatedAt || 0) - 3_600_000;
  const newCount =
    data?.filter((row) => new Date(row.lastSeenIso).getTime() > oneHourAgo).length ?? 0;

  const display = (n: number) => (isPending && !data ? "—" : n);

  return (
    <div className="grid grid-cols-4 gap-2.5">
      <KpiCard
        label="ISSUES OUVERTES"
        value={display(total)}
        subtitle="total non résolues"
        accent="red"
      />
      <KpiCard
        label="NOUVELLES (1H)"
        value={display(newCount)}
        subtitle="dernière heure"
        accent="orange"
      />
      <KpiCard label="VISITEURS ACTIFS" value="—" subtitle="à venir" accent="green" />
      <ReservationsKpiCard projectId={projectId} intervalMs={intervalMs} />
    </div>
  );
}
