"use client";

import { ReservationsKpiCard } from "@/app/features/reservations/ui/ReservationsKpiCard";
import { IssueKpi } from "../../issues/ui/IssuesKpi";
import { VisitorsKpi } from "../../visitors/ui/VisitorsKpi";
import { ERROR_MONITOR_STRATEGY_ENUM, LOG_MONITOR_STRATEGY_ENUM, StrategiesKey, TRACKER_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";

interface KpiRowProps {
  documentId: string;
  limit: number;
  intervalMs: number;
  strategies?: StrategiesKey[]
}

export function KpiRow({ documentId,  limit, intervalMs, strategies }: KpiRowProps) {

  return (
    <div className="flex w-full gap-2.5">
      {strategies?.includes(ERROR_MONITOR_STRATEGY_ENUM) && (
        <IssueKpi documentId={documentId} limit={limit} intervalMs={intervalMs} />
      )}
      {strategies?.includes(TRACKER_MONITOR_STRATEGY_ENUM) && (
        <VisitorsKpi documentId={documentId} intervalMs={intervalMs} />
      )}
      {strategies?.includes(LOG_MONITOR_STRATEGY_ENUM) && (
        <ReservationsKpiCard documentId={documentId} intervalMs={intervalMs} />
      )}
    </div>
  );
}
