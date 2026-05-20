"use client";

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { IssueRow } from "../domain/IssueRow";
import { useIssues } from "../hooks/useIssues";
import { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";

interface IssuesPanelProps {
  projectId: string;
  limit: number;
  intervalMs: number;
}

const LEVEL_VARIANT: Record<ErrorLevel, "error" | "warning" | "info" | "debug"> = {
  error: "error",
  warning: "warning",
  info: "info",
  debug: "debug",
};

export function IssuesPanel({ projectId, limit, intervalMs }: IssuesPanelProps) {
  const { data, isPending, isFetching, isError, error } = useIssues(
    projectId,
    limit,
    intervalMs,
  );

  const rows = data ?? [];
  const showBackgroundDot = isFetching && !isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          Flux d&apos;erreurs
          <span className="ml-1 rounded-full border border-level-fatal-border bg-level-fatal-bg/50 px-1.5 py-0 font-mono text-[10px] text-level-fatal">
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
        <div className="border-b border-level-fatal-border bg-level-fatal-bg/40 px-3.5 py-2 font-mono text-[11px] text-level-fatal">
          Mise à jour impossible{error instanceof Error ? ` (${error.message})` : ""}.
        </div>
      )}

      <div className="max-h-[340px] overflow-y-auto">
        {isPending ? (
          <EmptyState>Chargement…</EmptyState>
        ) : isError && rows.length === 0 ? (
          <EmptyState tone="error">
            Erreur de chargement{error instanceof Error ? ` : ${error.message}` : ""}.
          </EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>Aucune issue non résolue</EmptyState>
        ) : (
          <ul>
            {rows.map((row) => (
              <IssueLine key={row.id} row={row} />
            ))}
          </ul>
        )}
      </div>
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

function IssueLine({ row }: { row: IssueRow }) {
  return (
    <li className="border-b border-border px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-muted/40">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 h-1 w-1 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="mb-1 truncate font-mono text-[11.5px] text-foreground">{row.title}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={LEVEL_VARIANT[row.level]}>{row.level}</Badge>
            <Badge variant="warning">{row.type}</Badge>
            <ProjectPill projectId={row.projectId} />
            <span className="font-mono text-[10px] text-muted-foreground/60">
              ×{row.eventCount}
            </span>
            <span
              className="font-mono text-[10px] text-muted-foreground/60"
              title={row.lastSeenIso}
            >
              {row.lastSeenLabel}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function ProjectPill({ projectId }: { projectId: string }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
      {projectId}
    </span>
  );
}
