"use client";

import { useDashboardKpis } from "../../kpis/hooks/useDashboardKpis";
import { TransitionStates } from "../states"
import { KpiCard } from "../../kpis/ui/KpiCard";


interface PanelKpiProps {
      panelSlug: string | null;
      intervalMs: number;
}

export function PanelKpi ({
    panelSlug,
    intervalMs,
}: PanelKpiProps) {

  // KPIS
  const { data, isPending, isFetching, isError, error } =
    useDashboardKpis(
      panelSlug,
      intervalMs,
    );

  const showBackgroundDot = isFetching && !isPending;

  if (!panelSlug) { return null }

    return (
        <div className="PanelKpi">
            <TransitionStates
                showBackgroundDot={showBackgroundDot}
                isError={isError}
                error={error}
            ></TransitionStates>

          <div className="KpiRow flex gap-2.5">
            {data?.map((kpi) => (
              <KpiCard
                key={kpi.slug}
                dashboardKpi={kpi}
                intervalMs={intervalMs}
              />
            ))}
          </div>

        </div>
    )
}
