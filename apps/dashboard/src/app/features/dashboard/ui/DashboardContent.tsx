"use client";

import { useState } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { useActiveProject } from "../hooks/useActiveProject";
import { useActivePanel } from "../hooks/useActivePanel";
import { useActiveWindow } from "../hooks/useActiveWindow";
import { useDashboardWindow, type WindowPreset } from "../state/useDashboardWindow";
import { cn } from "@/lib/utils";
import { PanelKpi } from "../../components/panel/panelKpi";
import { PanelBlock } from "../../components/panel/panelBlock";

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

  useActiveWindow(documentId);

  const { panelSlug } = useActivePanel(documentId);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader
        documentId={documentId}
        intervalMs={refreshIntervalMs}
      />
      <main className="flex flex-1 min-h-0 flex-col gap-3 p-4">

        <PanelKpi
          panelSlug={panelSlug}
          intervalMs={refreshIntervalMs}
        ></PanelKpi>

        <div className={cn("grid min-h-0 flex-1 gap-3")}>

          <PanelBlock
            panelSlug={panelSlug}
            limit={limit}
            intervalMs={refreshIntervalMs}>
          </PanelBlock>

        </div>
      </main>
    </div>
  );
}
