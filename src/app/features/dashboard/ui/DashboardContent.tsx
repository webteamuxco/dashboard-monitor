"use client";

import { useState } from "react";
import { IssuesPanel } from "@/app/features/issues/ui/IssuesPanel";
import { ReservationsPanel } from "@/app/features/reservations/ui/ReservationsPanel";
import { ErrorRatePanel } from "@/app/features/errorRate/ui/ErrorRatePanel";
import { DashboardHeader } from "./DashboardHeader";
import { IssuesKpiRow } from "./IssuesKpiRow";
import { useActiveProject } from "../hooks/useActiveProject";
import { useDashboardWindow, type WindowPreset } from "../state/useDashboardWindow";

interface DashboardContentProps {
  initialDocumentId: string;
  initialProjectId: string;
  initialWindowPresets: WindowPreset[];
  initialWindowMinutes: number;
  limit: number;
  fallbackRefreshIntervalMs: number;
}

export function DashboardContent({
  initialDocumentId,
  initialProjectId,
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

  const { documentId, projectId, refreshIntervalMs } = useActiveProject(
    initialDocumentId,
    initialProjectId,
    fallbackRefreshIntervalMs,
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader
        projectId={projectId}
        documentId={documentId}
        limit={limit}
        intervalMs={refreshIntervalMs}
      />
      <main className="flex flex-1 min-h-0 flex-col gap-3 p-4">
        <IssuesKpiRow documentId={documentId} limit={limit} intervalMs={refreshIntervalMs} />

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="min-h-0 flex-1">
              <IssuesPanel documentId={documentId} limit={limit} intervalMs={refreshIntervalMs} />
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-3">
            <div className="min-h-0 flex-1">
              <ErrorRatePanel documentId={documentId} intervalMs={refreshIntervalMs} />
            </div>
            <div className="min-h-0 flex-1">
              <ReservationsPanel documentId={documentId} intervalMs={refreshIntervalMs} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
