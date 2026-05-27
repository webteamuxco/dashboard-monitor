# Data flow

This doc traces concrete request paths through the layers, so you can map any UI behavior back to its source. For the layered overview, see [architecture.md](architecture.md).

## The two flavors of request

There are two distinct fetch paths in this app:

1. **Server prefetch** — runs once per page load, inside the Server Component. Hydrates the TanStack Query cache so the first paint already has data.
2. **Client polling** — runs in the browser, on a timer, after hydration. This is what keeps the kiosk fresh.

Both paths go through the *same* data-access layer; the difference is only who calls it.

```mermaid
flowchart LR
    subgraph SSR[Server-side - first paint]
        Page[page.tsx<br/>Server Component]
        QC[QueryClient prefetch]
        Page --> QC
    end
    subgraph CSR[Client-side - polling]
        Hook[useX TanStack Query hook]
        Hook -->|GET /api/...| Route[app/api/.../route.ts]
    end
    QC --> DA[Data Access]
    Route --> DA
    DA --> Mon[Monitor strategy]
    Mon --> Ext[(External API)]
```

## Path 1: server prefetch on first load

```mermaid
sequenceDiagram
    participant B as Browser
    participant Page as page.tsx (Server Component)
    participant QC as QueryClient (server)
    participant DA as Data Access
    participant Mon as Monitor strategy
    participant Ext as External API

    B->>Page: GET /
    Page->>Page: read DASHBOARD_DEFAULT_PROJECT_ID, intervals, windows
    Page->>QC: new QueryClient()

    par 4 prefetches in parallel
        Page->>QC: prefetchQuery(issuesKeys.recent, ...)
        QC->>DA: getRecentUnresolved(projectId, limit)
        DA->>Mon: getIssues(projectId)
        Mon->>Ext: GET /api/0/projects/{slug}/{id}/issues/
        Ext-->>Mon: GlitchTipIssueDto[]
        Mon->>Mon: map to Issue[]
        Mon-->>DA: Issue[]
        DA->>DA: map to IssueRow[]
        DA-->>QC: IssueRow[]
    and
        Page->>QC: prefetchQuery(errorRateKeys.series, ...)
        QC->>DA: getSeries(projectId)
        DA->>Mon: getErrorStats(projectId, period=24h)
        Mon-->>DA: TimeSeriesPoint[]
        DA-->>QC: ErrorRatePoint[]
    and
        Page->>QC: prefetchQuery(reservationsKeys.series, ...)
        QC->>DA: getSeries(projectId, windowMinutes)
        DA->>Mon: getLogs(projectId, query: "reservation.sent")
        Mon-->>DA: Log[]
        DA-->>QC: ReservationPoint[]
    and
        Page->>QC: prefetchQuery(visitorsKeys.timeline, ...)
        QC->>DA: getSeries(projectId, windowMinutes)
        DA->>Mon: getActiveUsersTimeline(projectId, windowMinutes)
        Mon-->>DA: VisitorsTimeSeriesPoint[]
        DA-->>QC: VisitorPoint[]
    end

    Page->>Page: dehydrate(queryClient)
    Page-->>B: HTML + dehydrated state in HydrationBoundary
    Note over B: First paint already shows data
```

Key properties:

- All four prefetches run in parallel (`Promise.all` via QueryClient).
- The same query keys are used server-side and client-side, so TanStack Query rehydrates seamlessly.
- After hydration, the panels mount and TanStack Query takes over.

## Path 2: client polling

```mermaid
sequenceDiagram
    participant Panel as IssuesPanel
    participant Hook as useIssues
    participant TQ as TanStack Query cache
    participant Fetch as fetchIssuesClient
    participant Route as /api/issues
    participant DA as IssuesDataAccess
    participant Mon as GlitchTipStrategy
    participant Ext as GlitchTip API

    Panel->>Hook: useIssues(projectId, limit, intervalMs)
    Hook->>TQ: useQuery({ queryKey, queryFn, refetchInterval })
    TQ->>TQ: hydrated data present -> initial render OK

    loop every intervalMs
        TQ->>Fetch: fetchIssuesClient(projectId, limit)
        Fetch->>Route: GET /api/issues?projectId=X&limit=Y
        Route->>DA: getRecentUnresolved(projectId, limit)
        DA->>Mon: getIssues(projectId)
        Mon->>Ext: GET /api/0/projects/.../issues/
        Ext-->>Mon: GlitchTipIssueDto[]
        Mon-->>DA: Issue[]
        DA-->>Route: IssueRow[]
        Route-->>Fetch: { data: IssueRow[] }
        Fetch-->>TQ: IssueRow[]
        TQ->>TQ: update cache + notify subscribers
        TQ-->>Panel: rerender with fresh data
    end
```

`intervalMs` comes from `DASHBOARD_REFRESH_INTERVAL_MS` (default 30000). Each panel polls independently — there is no global tick.

## Path 3: on-demand fetch (issue detail)

A *user-triggered* fetch path: clicking an issue row opens the detail sheet and fetches its full payload (issue + latest event + recent events + comments).

```mermaid
sequenceDiagram
    participant User
    participant Panel as IssuesPanel
    participant Sheet as IssueDetailSheet
    participant Hook as useIssueDetail
    participant Route as /api/issues/[id]
    participant DA as IssuesDataAccess
    participant Mon as GlitchTipStrategy
    participant Ext as GlitchTip API

    User->>Panel: click issue row
    Panel->>Panel: setSelectedIssueId(id)
    Panel->>Sheet: render with issueId
    Sheet->>Hook: useIssueDetail(issueId)
    Hook->>Hook: enabled = !!issueId, queryKey = detail(issueId)
    Hook->>Route: GET /api/issues/{id}
    Route->>DA: getDetail(id)

    par fetch 4 things in parallel
        DA->>Mon: getIssue(id)
        Mon->>Ext: GET /api/0/issues/{id}/
    and
        DA->>Mon: getIssueLatestEvent(id)
        Mon->>Ext: GET /api/0/issues/{id}/events/latest/
    and
        DA->>Mon: getIssueEvents(id, limit=25)
        Mon->>Ext: GET /api/0/issues/{id}/events/?limit=25
    and
        DA->>Mon: getIssueComments(id)
        Mon->>Ext: GET /api/0/issues/{id}/comments/
    end

    Mon-->>DA: { issue, latestEvent, events, comments }
    DA-->>Route: IssueDetailView
    Route-->>Hook: { data: IssueDetailView }
    Hook-->>Sheet: data
    Sheet->>Sheet: render Stacktrace / Tags / Context / Breadcrumbs / Events / Comments
```

The detail query is **not** prefetched server-side — it only fires when a row is clicked. Once fetched, it's cached under `["issues", "detail", issueId]` for the rest of the session (subject to `staleTime: 30000`).

## DTO -> domain mapping

Every external response goes through a Mapper before reaching the data access layer. This is what keeps the rest of the codebase provider-agnostic.

```mermaid
flowchart LR
    Raw[Raw HTTP JSON] -->|GlitchTipClient.get| DTO[GlitchTipIssueDto<br/>provider shape]
    DTO -->|mapGlitchTipIssue| Domain[Issue<br/>our domain]
    Domain -->|in DataAccess| Feature[IssueRow<br/>UI-ready shape]
```

Three shapes, three responsibilities:

- **DTO** — verbatim mirror of the provider's response. Lives in `adapters/<provider>/dto/`.
- **Domain** — our internal monitor-family type (`Issue`, `Log`, `VisitorsTimeSeriesPoint`). Lives in `src/lib/<family>/domain/`.
- **Feature type** — what a panel actually consumes (`IssueRow`, `ErrorRatePoint`). Lives in `src/app/features/<name>/domain/`.

If you find yourself importing a DTO outside its adapter folder, that's a leak. Add a mapper.

## Error handling

API routes wrap their data-access calls and return `{ error: string }` on failure. The TanStack Query hook receives the error; the panel renders an error state.

```mermaid
flowchart LR
    Mon[Strategy] -- throws --> DA[Data access]
    DA -- propagates --> Route[API route]
    Route -- 500 + { error } --> Hook[useQuery]
    Hook -- isError=true --> UI[Panel error state]
```

Common error sources:

- Missing env var → `GetXMonitor` throws → 500 on first request.
- Provider 4xx/5xx → `HttpClient` throws `Error("HTTP <status>: ...")` → 500 to client.
- Mapping failure (unexpected DTO shape) → throw in the mapper → 500 to client.

TanStack Query retries once (`retry: 1`) before surfacing the error.
