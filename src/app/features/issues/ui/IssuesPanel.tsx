"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { IssueRow } from "../domain/IssueRow";
import { useIssues } from "../hooks/useIssues";
import { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";
import { IssueDetailSheet } from "./IssueDetailSheet";
import { isDashboardInteractive } from "../../dashboard/state/useDashboardWindow";
import { useEnvironment } from "@/app/features/dashboard/state/useEnvironment";

interface IssuesPanelProps {
  projectId: string;
  limit: number;
  intervalMs: number;
}

const LEVEL_VARIANT: Record<ErrorLevel, "fatal" | "error" | "warning" | "info" | "debug"> = {
  fatal: "fatal",
  error: "error",
  warning: "warning",
  info: "info",
  debug: "debug",
};

const LEVEL_ROW_CLASS: Record<ErrorLevel, string> = {
  fatal: "bg-level-fatal-bg hover:bg-level-fatal-bg/80",
  error: "bg-level-error-bg hover:bg-level-error-bg/80",
  warning: "hover:bg-muted/40",
  info: "hover:bg-muted/40",
  debug: "hover:bg-muted/40",
};

export function IssuesPanel({ projectId, limit, intervalMs }: IssuesPanelProps) {
  const environment = useEnvironment((s) => s.environment);
  const { data, isPending, isFetching, isError, error } = useIssues(
    projectId,
    limit,
    environment,
    intervalMs,
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const rows = data ?? [];
  const showBackgroundDot = isFetching && !isPending;
  const isInteractive = isDashboardInteractive()
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle>
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          Flux d&apos;erreurs
          <span className="ml-1 rounded-full border border-level-fatal-border bg-level-fatal-bg/50 px-1.5 py-0 font-mono text-[0.625rem] text-level-fatal">
            {rows.length}
          </span>
        </CardTitle>
        {showBackgroundDot && (
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
            aria-label="Mise à jour en cours"
          />
        )}
      </CardHeader>

      {isError && rows.length > 0 && (
        <div className="border-b border-level-fatal-border bg-level-fatal-bg/40 px-3.5 py-2 font-mono text-[0.6875rem] text-level-fatal">
          Mise à jour impossible{error instanceof Error ? ` (${error.message})` : ""}.
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isPending ? (
          <EmptyState>Chargement…</EmptyState>
        ) : isError && rows.length === 0 ? (
          <EmptyState tone="error">
            Erreur de chargement{error instanceof Error ? ` : ${error.message}` : ""}.
          </EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>Aucune issue</EmptyState>
        ) : (
          <ul>
            {rows.map((row) => (
              <IssueLine
                key={row.id}
                row={row}
                onSelect={() => setSelectedIssueId(row.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {isInteractive && (
          <>
          <IssueDetailSheet
            issueId={selectedIssueId}
            onOpenChange={(open) => {
              if (!open) setSelectedIssueId(null);
            }}
          />
        </>
      )}
    </Card>
  );
}

function EmptyState({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <div
      className={`px-5 py-10 text-center text-xs ${
        tone === "error" ? "text-level-fatal" : "text-muted-foreground/60"
      }`}
    >
      {children}
    </div>
  );
}

function IssueLine({ row, onSelect }: { row: IssueRow; onSelect: () => void }) {
  const rowClass = row.isResolved
    ? "opacity-60 hover:bg-muted/40"
    : LEVEL_ROW_CLASS[row.level];
  return (
    <li
      className={`border-b border-border last:border-b-0 ${rowClass}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full cursor-pointer px-3.5 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <div className="flex items-start gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="mb-1 truncate font-mono text-[0.71875rem] text-foreground">{row.title}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={LEVEL_VARIANT[row.level]}>{row.level}</Badge>
              {row.isResolved && <Badge variant="resolved">résolu</Badge>}
              {row.type && <Badge variant="warning">{row.type}</Badge>}
              <ProjectPill projectId={row.projectId} />
              <span className="font-mono text-[0.625rem] text-muted-foreground/60">
                ×{row.eventCount}
              </span>
              <span
                className="font-mono text-[0.625rem] text-muted-foreground/60"
                title={row.lastSeenIso}
              >
                {row.lastSeenLabel}
              </span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

function ProjectPill({ projectId }: { projectId: string }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] font-medium text-muted-foreground">
      {projectId}
    </span>
  );
}
