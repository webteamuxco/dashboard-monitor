"use client";

import { useState } from "react";
import { IssuesPanel } from "@/app/features/issues/ui/IssuesPanel";
import { ReservationsPanel } from "@/app/features/reservations/ui/ReservationsPanel";
import { ErrorRatePanel } from "@/app/features/errorRate/ui/ErrorRatePanel";
import { DashboardHeader } from "./DashboardHeader";
import { useActiveProject } from "../hooks/useActiveProject";
import { useDashboardWindow, type WindowPreset } from "../state/useDashboardWindow";
import { useProjectStrategy } from "../../issues/hooks/useProjectStrategy";
import { useEnvironment } from "../state/useEnvironment";
import { Strategy } from "@/lib/config/domain/Strategy";
import { ERROR_MONITOR_STRATEGY_ENUM, LOG_MONITOR_STRATEGY_ENUM, TRACKER_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";
import { VisitorsPanel } from "../../visitors/ui/VisitorsPanel";
import { KpiRow } from "./IssuesKpiRow";
import { EmptyState } from "./EmptyState";
import { useSelectedPanel } from "../state/useSelectedPanel";
import { cn } from "@/lib/utils";

interface DashboardContentProps {
  initialDocumentId: string;
  initialWindowPresets: WindowPreset[];
  initialWindowMinutes: number;
  limit: number;
  fallbackRefreshIntervalMs: number;
}


export function DashboardContent({
  initialDocumentId,
  initialWindowPresets,
  initialWindowMinutes,
  limit,
  fallbackRefreshIntervalMs,
}: DashboardContentProps) {

  const hydrateFromStrapi = useDashboardWindow((s) => s.hydrateFromStrapi);

  useState(() => {
    hydrateFromStrapi(initialWindowPresets, initialWindowMinutes);
    return true;
  });


  const { documentId, refreshIntervalMs } = useActiveProject(
    initialDocumentId,
    fallbackRefreshIntervalMs,
  );

  const environment = useEnvironment((s) => s.environment);
  const panelSlug = useSelectedPanel((s) => s.panelSlug);
  const panelId = useSelectedPanel((s) => s.pannelId);

  const { data, isPending, isFetching, isError, error } =
    useProjectStrategy(
      documentId,
      panelSlug,
      environment,
      refreshIntervalMs,
    );

  const strategies = data?.map((strategy: Strategy) => {
    return strategy.name
  })

  const showBackgroundDot = isFetching && !isPending;
  const hasLeftColumn =
    strategies?.includes(ERROR_MONITOR_STRATEGY_ENUM) ||
    strategies?.includes(TRACKER_MONITOR_STRATEGY_ENUM);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader
        documentId={documentId}
        panelId={panelId}
        limit={limit}
        intervalMs={refreshIntervalMs}
      />
      <main className="flex flex-1 min-h-0 flex-col gap-3 p-4">

        <KpiRow documentId={panelId} limit={limit} intervalMs={refreshIntervalMs} strategies={strategies} />

        <div className={cn("grid min-h-0 flex-1 gap-3", hasLeftColumn ? "grid-cols-2": "grid-cols-1")}>
          
          <div className={cn("flex min-h-0 flex-col gap-3", !hasLeftColumn ? 'hidden' : "" )}>

            {showBackgroundDot && (
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                aria-label="Mise à jour en cours"
              />
            )}
                
            {isError && (
              <EmptyState tone="error">
                Erreur de chargement{error instanceof Error ? ` : ${error.message}` : ""}.
              </EmptyState>
            )}

            {strategies?.includes(ERROR_MONITOR_STRATEGY_ENUM) && 
              <div className="min-h-0 flex-1">
                  <IssuesPanel documentId={panelId} limit={limit} intervalMs={refreshIntervalMs} />
              </div>
            }

            {strategies?.includes(TRACKER_MONITOR_STRATEGY_ENUM) && 
              <div className="min-h-0 flex-1">
                  <VisitorsPanel documentId={panelId} intervalMs={refreshIntervalMs} />
              </div>
            }
          </div>
          
          <div className="flex min-h-0 flex-col gap-3">

            {showBackgroundDot && (
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                aria-label="Mise à jour en cours"
              />
            )}
                
            {error && (
              <EmptyState tone="error">
                Erreur de chargement{error instanceof Error ? ` : ${error.message}` : ""}.
              </EmptyState>
            )}

            {strategies?.includes(ERROR_MONITOR_STRATEGY_ENUM) &&
              <div className="min-h-0 flex-1">              
                  <ErrorRatePanel documentId={panelId} intervalMs={refreshIntervalMs} />
              </div>
            }

            {strategies?.includes(LOG_MONITOR_STRATEGY_ENUM) &&
              <div className="min-h-0 flex-1">
                <ReservationsPanel documentId={panelId} intervalMs={refreshIntervalMs} />
              </div>
            }
          </div>
        </div>
      </main>
    </div>
  );
}
