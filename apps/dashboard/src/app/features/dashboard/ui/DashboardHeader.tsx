"use client";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { BookOpenText, LayoutDashboard, ListRestart, RotateCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { WindowSelector } from "./WindowSelector";
import { EnvironmentSelector } from "./EnvironmentSelector";
import { ProjectSelector } from "./ProjectSelector";
import { isDashboardInteractive } from "../state/useDashboardWindow";
import { useEnvironment } from "../state/useEnvironment";
import { PannelSelector } from "./PannelSelector";

interface DashboardHeaderProps {
  documentId: string;
  panelId: string;
  limit: number;
  intervalMs: number;
}

export function DashboardHeader({ documentId, panelId, limit, intervalMs }: DashboardHeaderProps) {

  const adminUrl = process.env.NEXT_PUBLIC_STRAPI_ADMIN_URL ?? '/admin'
  const docsSiteUrl = process.env.NEXT_PUBLIC_DOCS_SITE_URL ?? '/docs'
  const queryClient = useQueryClient();
  const environment = useEnvironment((s) => s.environment);
  const { dataUpdatedAt } = useIssues(panelId, limit, environment, intervalMs);
  const isFetching = useIsFetching() > 0;

  const intervalSeconds = Math.round(intervalMs / 1000);
  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("fr-FR")
    : "—";

  const isInteractive = isDashboardInteractive()

  return (
    <>
    <header className="sticky top-0 z-50 flex h-13 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="pointer-events-none font-mono text-sm font-semibold">
            {process.env.NEXT_PUBLIC_PROJECT_TITLE}
        </span>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-status-live/25 bg-status-live-bg px-2 py-0.5 font-mono text-[0.6875rem] text-status-live">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-status-live ${
              isFetching ? "animate-pulse" : ""
            }`}
            aria-hidden
          />
          EN DIRECT
        </div>

        <span className="flex rounded border gap-2.5 border-border bg-muted px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">
          <ListRestart className="w-4 h-4"/> polling {intervalSeconds}s
        </span>

      </div>


      
        <div className="flex items-center gap-2">
          {isInteractive && (
            <>
              <ProjectSelector fallbackDocumentId={documentId} />
              <PannelSelector fallbackDocumentId={documentId}></PannelSelector>
              {/** 
                <EnvironmentSelector />
              */}
              <WindowSelector />
            </>
          )}
          <span className="font-mono text-[0.6875rem] text-muted-foreground/60">Dernier rafraîchissement: {lastUpdate}</span>
          {isInteractive && (
            <>
          <Button
            variant="outline"
            size="sm"
            className={isFetching ? "cursor-progress" : "cursor-pointer"}
            onClick={() => queryClient.invalidateQueries()}
            disabled={isFetching}
          >
            <RotateCw className={isFetching ? "animate-spin" : ""} />
            Rafraîchir
          </Button>

          <a href={adminUrl} target="_blank"> 
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
            >
              <LayoutDashboard /> Admin
            </Button>
           </a>

          <a href={docsSiteUrl} target="_blank"> 
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
            >
              <BookOpenText /> Documentation
            </Button>
          </a>
           </>
          )}
        </div>

      </header>
    </>
  );
}
