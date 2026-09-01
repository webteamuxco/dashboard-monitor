import { CircleAlert, TrendingUp } from "lucide-react";
import { useDashboardWindow } from "../../dashboard/state/useDashboardWindow";
import { useEnvironment } from "../../dashboard/state/useEnvironment";
import { formatWindowLabel } from "../../dashboard/state/windowPresets";
import { KpiCard } from "../../dashboard/ui/KpiCard"
import { useIssues } from "../hooks/useIssues";


export type IssueKpiProps = {
  documentId: string;
  limit: number;
  intervalMs: number;
}

export function IssueKpi({ documentId, limit, intervalMs }: IssueKpiProps) {

    const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
    const windowLabel = formatWindowLabel(windowMinutes);

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

    return (
        <>
        <KpiCard
            label="ISSUES OUVERTES"
            value={display(total)}
            subtitle="total non résolues"
            accent="red"
            icon={<CircleAlert className="h-4.5 w-4.5 text-level-fatal" />}
        />
        <KpiCard
            label={`NOUVELLES (${windowLabel.toUpperCase()})`}
            value={display(newCount)}
            subtitle={`fenêtre ${windowLabel}`}
            accent="orange"
            icon={<TrendingUp className="h-4.5 w-4.5 text-level-warning" />}
        />
        </>
    )
}