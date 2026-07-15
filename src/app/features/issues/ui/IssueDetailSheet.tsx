"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";
import type {
  Breadcrumb,
  ExceptionEntry,
  IssueEvent,
  ProcessingError,
} from "@/lib/errorMonitor/domain/IssueEvent";
import type { IssueComment } from "@/lib/errorMonitor/domain/IssueComment";
import { useIssueDetail } from "../hooks/useIssueDetail";


const LEVEL_VARIANT: Record<ErrorLevel, "fatal" | "error" | "warning" | "info" | "debug"> = {
  fatal: "fatal",
  error: "error",
  warning: "warning",
  info: "info",
  debug: "debug",
};

interface IssueDetailSheetProps {
  issueId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function IssueDetailSheet({ issueId, onOpenChange }: IssueDetailSheetProps) {
  const open = !!issueId;
  const { data, isPending, isError, error } = useIssueDetail(issueId);
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-1/2 data-[side=right]:sm:max-w-[50vw]"
      >
        {open && isPending && <SheetLoading />}
        {open && isError && (
          <SheetError message={error instanceof Error ? error.message : "Erreur inconnue"} />
        )}
        {open && data && <DetailBody detail={data} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetLoading() {
  return (
    <>
      <SheetHeader className="border-b border-border">
        <SheetTitle>Chargement…</SheetTitle>
        <SheetDescription>Récupération des détails de l&apos;issue.</SheetDescription>
      </SheetHeader>
      <div className="flex-1 px-4 py-6 text-xs text-muted-foreground">
        Chargement…
      </div>
    </>
  );
}

function SheetError({ message }: { message: string }) {
  return (
    <>
      <SheetHeader className="border-b border-level-fatal-border bg-level-fatal-bg/30">
        <SheetTitle className="text-level-fatal">
          <AlertTriangle className="mr-1.5 inline h-4 w-4" />
          Erreur de chargement
        </SheetTitle>
        <SheetDescription className="text-level-fatal/80">{message}</SheetDescription>
      </SheetHeader>
    </>
  );
}

function DetailBody({ detail }: { detail: NonNullable<ReturnType<typeof useIssueDetail>["data"]> }) {
  const { issue, latestEvent, events, comments } = detail;

  return (
    <>
      <SheetHeader className="border-b border-border">
        <SheetTitle className="font-mono text-sm break-words">
          {issue.title}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Détails de l&apos;issue {issue.id}
        </SheetDescription>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant={LEVEL_VARIANT[issue.level]}>{issue.level}</Badge>
          <Badge variant="warning">{issue.type}</Badge>
          <ProjectPill projectId={issue.projectId} />
          <span className="font-mono text-[0.625rem] text-muted-foreground/70">
            ×{issue.eventCount}
          </span>
          <span
            className="font-mono text-[0.625rem] text-muted-foreground/70"
            title={issue.lastSeenIso}
          >
            vu {issue.lastSeenLabel}
          </span>
        </div>
      </SheetHeader>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-5">
        <MetaSection
          firstSeenIso={issue.firstSeenIso}
          firstSeenLabel={issue.firstSeenLabel}
          lastSeenIso={issue.lastSeenIso}
          lastSeenLabel={issue.lastSeenLabel}
          eventCount={issue.eventCount}
          isResolved={issue.isResolved}
        />

        {latestEvent && latestEvent.errors.length > 0 && (
          <ProcessingErrorsSection errors={latestEvent.errors} />
        )}

        {latestEvent && <StacktraceSection event={latestEvent} />}
        {latestEvent && latestEvent.tags.length > 0 && <TagsSection event={latestEvent} />}
        {latestEvent && <ContextSection event={latestEvent} />}
        {latestEvent && <AdditionalDataSection event={latestEvent} />}
        {latestEvent && <EventInfoSection event={latestEvent} />}
        {latestEvent && latestEvent.breadcrumbs.length > 0 && (
          <BreadcrumbsSection breadcrumbs={latestEvent.breadcrumbs} />
        )}

        <EventsSection events={events} />
        <CommentsSection comments={comments} />
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
      {children}
    </h3>
  );
}

function ProjectPill({ projectId }: { projectId: string }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] font-medium text-muted-foreground">
      {projectId}
    </span>
  );
}

function MetaSection({
  firstSeenIso,
  firstSeenLabel,
  lastSeenIso,
  lastSeenLabel,
  eventCount,
  isResolved,
}: {
  firstSeenIso: string;
  firstSeenLabel: string;
  lastSeenIso: string;
  lastSeenLabel: string;
  eventCount: number;
  isResolved: boolean;
}) {
  return (
    <section>
      <SectionTitle>Détails</SectionTitle>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[0.6875rem]">
        <MetaRow label="Première occurrence" value={firstSeenLabel} title={firstSeenIso} />
        <MetaRow label="Dernière occurrence" value={lastSeenLabel} title={lastSeenIso} />
        <MetaRow label="Événements" value={String(eventCount)} />
        <MetaRow label="Statut" value={isResolved ? "résolu" : "non résolu"} />
      </dl>
    </section>
  );
}

function MetaRow({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <>
      <dt className="text-muted-foreground/70">{label}</dt>
      <dd className="text-foreground" title={title}>
        {value}
      </dd>
    </>
  );
}

function StacktraceSection({ event }: { event: IssueEvent }) {
  const exceptions = event.exceptions;
  if (exceptions.length === 0) {
    return (
      <section>
        <SectionTitle>Stacktrace</SectionTitle>
        <p className="font-mono text-[0.6875rem] text-muted-foreground/70">
          Aucune exception capturée dans le dernier événement.
        </p>
      </section>
    );
  }
  return (
    <section>
      <SectionTitle>Stacktrace (dernier événement)</SectionTitle>
      <div className="space-y-3">
        {exceptions.map((exc, i) => (
          <ExceptionBlock key={i} exc={exc} />
        ))}
      </div>
    </section>
  );
}

function ExceptionBlock({ exc }: { exc: ExceptionEntry }) {
  // Reverse to show the most recent frame first (Sentry convention)
  const frames = useMemo(() => [...exc.frames].reverse(), [exc.frames]);
  return (
    <div className="rounded border border-border bg-muted/30">
      <div className="border-b border-border px-2.5 py-1.5 font-mono text-[0.6875rem]">
        <span className="text-level-fatal">{exc.type ?? "Exception"}</span>
        {exc.value && <span className="text-foreground">: {exc.value}</span>}
      </div>
      <ul className="divide-y divide-border">
        {frames.map((f, i) => (
          <li
            key={i}
            className={`px-2.5 py-1.5 font-mono text-[0.625rem] ${
              f.inApp ? "" : "opacity-60"
            }`}
          >
            <div className="text-muted-foreground/80">
              <span className="text-foreground">{f.function ?? "?"}</span>
              <span className="text-muted-foreground/60"> in </span>
              <span className="text-foreground">{f.filename ?? "?"}</span>
              {f.lineNo != null && (
                <span className="text-muted-foreground/60">
                  :{f.lineNo}
                  {f.colNo != null && `:${f.colNo}`}
                </span>
              )}
            </div>
            {f.contextLine && (
              <pre className="mt-1 overflow-x-auto whitespace-pre text-muted-foreground/80">
                {f.contextLine}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TagsSection({ event }: { event: IssueEvent }) {
  return (
    <section>
      <SectionTitle>Tags</SectionTitle>
      <ul className="flex flex-wrap gap-1.5">
        {event.tags.map((t) => (
          <li
            key={`${t.key}=${t.value}`}
            className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[0.625rem]"
          >
            <span className="text-muted-foreground/70">{t.key}</span>
            <span className="text-muted-foreground/40">=</span>
            <span className="text-foreground">{t.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContextSection({ event }: { event: IssueEvent }) {
  const { user, request, contexts } = event;
  const hasUser = !!user && (user.id || user.email || user.username || user.ipAddress);
  const hasRequest = !!request && (request.url || request.method);
  const contextEntries = Object.entries(contexts ?? {});

  if (!hasUser && !hasRequest && contextEntries.length === 0) return null;

  return (
    <section>
      <SectionTitle>Contexte</SectionTitle>
      <div className="space-y-2">
        {hasUser && user && (
          <ContextBlock title="user">
            {user.id && <KV k="id" v={user.id} />}
            {user.username && <KV k="username" v={user.username} />}
            {user.email && <KV k="email" v={user.email} />}
            {user.ipAddress && <KV k="ip" v={user.ipAddress} />}
          </ContextBlock>
        )}
        {hasRequest && request && (
          <ContextBlock title="request">
            {request.method && <KV k="method" v={request.method} />}
            {request.url && <KV k="url" v={request.url} />}
          </ContextBlock>
        )}
        {contextEntries.map(([key, data]) => (
          <ContextBlock key={key} title={key}>
            {Object.entries(data).map(([k, v]) => (
              <KV key={k} k={k} v={formatContextValue(v)} />
            ))}
          </ContextBlock>
        ))}
      </div>
    </section>
  );
}

function formatContextValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function ContextBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <div className="mb-1 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground/70">
        {title}
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 font-mono text-[0.625rem]">
        {children}
      </dl>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <>
      <dt className="text-muted-foreground/70">{k}</dt>
      <dd className="break-all text-foreground">{v}</dd>
    </>
  );
}

function AdditionalDataSection({ event }: { event: IssueEvent }) {
  const entries = Object.entries(event.context ?? {});
  if (entries.length === 0) return null;
  return (
    <section>
      <SectionTitle>Additional data</SectionTitle>
      <div className="rounded border border-border bg-muted/30 p-2">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 font-mono text-[0.625rem]">
          {entries.map(([k, v]) => (
            <KV key={k} k={k} v={formatContextValue(v)} />
          ))}
        </dl>
      </div>
    </section>
  );
}

function EventInfoSection({ event }: { event: IssueEvent }) {
  const { sdk, culprit, packages, metadata } = event;
  const metadataEntries = Object.entries(metadata ?? {});
  const packageEntries = Object.entries(packages ?? {});
  const sdkLabel = sdk
    ? [sdk.name, sdk.version].filter(Boolean).join("@")
    : "";
  const hasInfo =
    !!culprit || !!sdkLabel || metadataEntries.length > 0 || packageEntries.length > 0;

  if (!hasInfo) return null;

  return (
    <section>
      <SectionTitle>Info événement</SectionTitle>
      <div className="space-y-2">
        {(culprit || sdkLabel) && (
          <ContextBlock title="event">
            {culprit && <KV k="culprit" v={culprit} />}
            {sdkLabel && <KV k="sdk" v={sdkLabel} />}
          </ContextBlock>
        )}
        {metadataEntries.length > 0 && (
          <ContextBlock title="metadata">
            {metadataEntries.map(([k, v]) => (
              <KV key={k} k={k} v={formatContextValue(v)} />
            ))}
          </ContextBlock>
        )}
        {packageEntries.length > 0 && (
          <CollapsibleContextBlock title={`packages (${packageEntries.length})`}>
            {packageEntries.map(([k, v]) => (
              <KV key={k} k={k} v={v} />
            ))}
          </CollapsibleContextBlock>
        )}
      </div>
    </section>
  );
}

function CollapsibleContextBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground/70" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground/70" />
        )}
        <span className="font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground/70">
          {title}
        </span>
      </button>
      {open && (
        <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 font-mono text-[0.625rem]">
          {children}
        </dl>
      )}
    </div>
  );
}

function ProcessingErrorsSection({ errors }: { errors: ProcessingError[] }) {
  return (
    <section>
      <SectionTitle>Erreurs de traitement ({errors.length})</SectionTitle>
      <ul className="space-y-1.5">
        {errors.map((e, i) => (
          <li
            key={i}
            className="rounded border border-level-warning-border bg-level-warning-bg/30 px-2 py-1.5 font-mono text-[0.625rem]"
          >
            <div className="text-level-warning">{e.type ?? "error"}</div>
            {e.message && <div className="text-foreground">{e.message}</div>}
            {e.data && Object.keys(e.data).length > 0 && (
              <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 text-muted-foreground/80">
                {Object.entries(e.data).map(([k, v]) => (
                  <KV key={k} k={k} v={formatContextValue(v)} />
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BreadcrumbsSection({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) {
  const [open, setOpen] = useState(false);
  const last = breadcrumbs.slice(-20);
  return (
    <section>
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground/70" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground/70" />
        )}
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Breadcrumbs ({breadcrumbs.length})
        </span>
      </button>
      {open && (
        <ul className="mt-2 divide-y divide-border rounded border border-border bg-muted/30">
          {last.map((b, i) => (
            <li key={i} className="px-2 py-1 font-mono text-[0.625rem]">
              <div className="flex items-center gap-2 text-muted-foreground/70">
                <span>{b.timestamp ?? "—"}</span>
                {b.category && <span className="text-foreground">{b.category}</span>}
                {b.level && <span className="text-muted-foreground/60">{b.level}</span>}
              </div>
              {b.message && <div className="text-foreground">{b.message}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EventsSection({ events }: { events: IssueEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section>
      <SectionTitle>Événements récents ({events.length})</SectionTitle>
      <ul className="divide-y divide-border rounded border border-border">
        {events.map((e) => (
          <li
            key={e.id}
            className="px-2.5 py-1.5 font-mono text-[0.625rem]"
            title={e.dateCreated}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-foreground">{e.eventID}</span>
              <span className="shrink-0 text-muted-foreground/70">{e.dateCreated}</span>
            </div>
            {e.message && (
              <div className="truncate text-muted-foreground/80">{e.message}</div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CommentsSection({ comments }: { comments: IssueComment[] }) {
  return (
    <section>
      <SectionTitle>Commentaires ({comments.length})</SectionTitle>
      {comments.length === 0 ? (
        <p className="font-mono text-[0.6875rem] text-muted-foreground/70">
          Aucun commentaire.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({ comment }: { comment: IssueComment }) {
  const author = comment.authorName ?? comment.authorEmail ?? "anonymous";
  return (
    <li className="rounded border border-border bg-muted/30 p-2 font-mono text-[0.6875rem]">
      <div className="mb-1 flex items-center gap-2 text-[0.625rem] text-muted-foreground/70">
        <span className="text-foreground">{author}</span>
        <span title={comment.dateCreated}>{comment.dateCreated}</span>
      </div>
      <p className="whitespace-pre-wrap text-foreground">{comment.text}</p>
    </li>
  );
}
