"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RotateCw, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { issuesKeys } from "@/app/features/issues/queryKeys";
import { WindowSelector } from "./WindowSelector";

interface DashboardHeaderProps {
  projectId: string;
  limit: number;
  intervalMs: number;
}

export function DashboardHeader({ projectId, limit, intervalMs }: DashboardHeaderProps) {
  const queryClient = useQueryClient();
  const { isFetching, dataUpdatedAt } = useIssues(projectId, limit, intervalMs);

  const intervalSeconds = Math.round(intervalMs / 1000);
  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("fr-FR")
    : "—";

  return (
    <header className="sticky top-0 z-50 flex h-13 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </span>
          MonitorFlow
        </div>

        <div className="flex items-center gap-1.5 rounded border border-status-live/25 bg-status-live-bg px-2 py-0.5 font-mono text-[11px] text-status-live">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-status-live ${
              isFetching ? "animate-pulse" : ""
            }`}
            aria-hidden
          />
          EN DIRECT
        </div>

        <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {projectId} · polling {intervalSeconds}s
        </span>
      </div>

      <div className="flex items-center gap-2">
        <WindowSelector />
        <span className="font-mono text-[11px] text-muted-foreground/60">{lastUpdate}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: issuesKeys.recent(projectId, limit) })
          }
          disabled={isFetching}
        >
          <RotateCw className={isFetching ? "animate-spin" : ""} />
          Rafraîchir
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Settings />
          Config
        </Button>
      </div>
    </header>
  );
}
