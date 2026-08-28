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

  const { data, isPending, isFetching, isError, error } = useProjectStrategy(
    documentId,
    environment,
    refreshIntervalMs,
  );

  const strategies = data?.map((strategy: Strategy) => {
    return strategy.name
  })

  const showBackgroundDot = isFetching && !isPending;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader
        documentId={documentId}
        limit={limit}
        intervalMs={refreshIntervalMs}
      />
      <main className="flex flex-1 min-h-0 flex-col gap-3 p-4">

        <KpiRow documentId={documentId} limit={limit} intervalMs={refreshIntervalMs} strategies={strategies} />

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          
          <div className="flex min-h-0 flex-col gap-3">

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
                  <IssuesPanel documentId={documentId} limit={limit} intervalMs={refreshIntervalMs} />
              </div>
            }

            {strategies?.includes(TRACKER_MONITOR_STRATEGY_ENUM) && 
              <div className="min-h-0 flex-1">
                  <VisitorsPanel documentId={documentId} intervalMs={refreshIntervalMs} />
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
                  <ErrorRatePanel documentId={documentId} intervalMs={refreshIntervalMs} />
              </div>
            }

            {strategies?.includes(LOG_MONITOR_STRATEGY_ENUM) &&
              <div className="min-h-0 flex-1">
                <ReservationsPanel documentId={documentId} intervalMs={refreshIntervalMs} />
              </div>
            }
          </div>
        </div>
      </main>
    </div>
  );
}
