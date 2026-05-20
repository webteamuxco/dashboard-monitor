# Data flow

This doc traces concrete request paths through the layers, so you can map any UI behavior back to its source. For the layered overview, see [architecture.md](architecture.md).

## The identifier that travels

Everything is keyed on the Strapi **`documentId`** of the selected project. It is what the browser sends, what the API routes validate, and what the monitor layer resolves a factory from. The **provider project id** (GlitchTip numeric id, PostHog project id) never leaves the server: it is read from the project's tool configuration and handed to the strategy.

```mermaid
flowchart LR
    Browser -->|documentId| Route[API route]
    Route -->|documentId| DA[Data access]
    DA -->|documentId| Factory
    Factory -->|Strapi lookup| Conn[ToolConnection<br/>baseUrl, org, projectId]
    Conn -->|connection.projectId| Strategy
    Strategy -->|provider id in the URL| Ext[(Provider API)]
```

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
    DA --> Mon[Monitor factory + strategy]
    Mon --> Ext[(External API)]
```

## Path 0: resolving the monitor for a project

Every data-access call starts with the same three steps. They are shown once here and elided in the sequences below.

```mermaid
sequenceDiagram
    participant DA as Data Access
    participant Get as get&lt;Family&gt;Monitor
    participant Factory
    participant Cfg as Tool configuration strategy
    participant Strapi

    DA->>Get: get<Family>Monitor(documentId)
    Get->>Factory: support(documentId, "<strategy>")
    Factory->>Cfg: isConfigure(documentId, "<strategy>", "<tool>")
    Cfg->>Strapi: GraphQL (cached per request)
    Strapi-->>Cfg: strategies[]
    Cfg-->>Factory: true
    Get-->>DA: factory

    DA->>Factory: createConnection(documentId)
    Factory->>Cfg: resolveConnection(documentId)
    Cfg->>Strapi: GraphQL (cached per request)
    Strapi-->>Cfg: tool configuration
    Cfg-->>DA: { baseUrl, organizationSlug?, projectId }

    DA->>Factory: createStrategy(connection)
    Factory-->>DA: strategy (client built with the env secret)
```

Both Strapi lookups are wrapped in React `cache()`, so four panels resolving the same project during one render hit Strapi once per query, not four times.

## Path 1: server prefetch on first load

```mermaid
sequenceDiagram
    participant B as Browser
    participant Page as page.tsx (Server Component)
    participant Cfg as ConfigDataAccess
    participant QC as QueryClient (server)
    participant DA as Data Access
    participant Mon as Monitor strategy
    participant Ext as External API

    B->>Page: GET /
    Page->>Cfg: getProjectsList()
    Cfg-->>Page: ProjectSummary[]
    Page->>Cfg: getProjectConfig(projects[0].documentId)
    Cfg-->>Page: Project
    Page->>Page: presetsFromTimeInterval(config.timeInterval)
    Page->>Page: resolveDefaultEnvironment()
    Page->>QC: setQueryData(configKeys.projects / project)

    par 4 prefetches in parallel
        Page->>QC: prefetchQuery(issuesKeys.recent, ...)
        QC->>DA: getRecentUnresolved(documentId, limit, environment)
        DA->>Mon: getIssues(connection.projectId, filters)
        Mon->>Ext: GET /api/0/organizations/{org}/issues/
        Ext-->>Mon: GlitchTipIssueDto[]
        Mon->>Mon: map to Issue[]
        Mon-->>DA: Issue[]
        DA->>DA: map to IssueRow[]
        DA-->>QC: IssueRow[]
    and
        Page->>QC: prefetchQuery(errorRateKeys.series, ...)
        QC->>DA: getSeries(documentId, environment)
        DA->>Mon: getErrorStats(projectId, period=24h, environment)
        Mon-->>DA: TimeSeriesPoint[]
        DA-->>QC: ErrorRatePoint[]
    and
        Page->>QC: prefetchQuery(reservationsKeys.series, ...)
        QC->>DA: getSeries(documentId, windowMinutes)
        DA->>Mon: getLogs(projectId, { query: "reservation.sent" }, period)
        Mon-->>DA: Log[]
        DA-->>QC: ReservationPoint[]
    and
        Page->>QC: prefetchQuery(visitorsKeys.timeline, ...)
        QC->>DA: getSeries(documentId, windowMinutes)
        DA->>Mon: getActiveUsersTimeline(projectId, windowMinutes)
        Mon-->>DA: VisitorsTimeSeriesPoint[]
        DA-->>QC: VisitorPoint[]
    end

    Page->>Page: dehydrate(queryClient)
    Page-->>B: HTML + dehydrated state in HydrationBoundary
    Note over B: First paint already shows data
```

Key properties:

- All four prefetches run in parallel (`Promise.all`).
- The same query keys are used server-side and client-side, so TanStack Query rehydrates seamlessly. This is why the default environment and the initial window are resolved by shared, isomorphic helpers — a mismatch would silently refetch everything on mount.
- Two early exits happen before any prefetch: no published project, or a selected project with no GlitchTip tool configuration. Both render an explicit message instead of empty panels.

## Path 2: client polling

```mermaid
sequenceDiagram
    participant Panel as IssuesPanel
    participant Hook as useIssues
    participant TQ as TanStack Query cache
    participant Fetch as fetchIssuesClient
    participant Route as /api/issues
    participant DA as IssuesDataAccess
    participant Mon as GlitchTipErrorMonitorStrategy
    participant Ext as GlitchTip API

    Panel->>Hook: useIssues(documentId, limit, environment, intervalMs)
    Hook->>TQ: useQuery({ queryKey, queryFn, refetchInterval })
    TQ->>TQ: hydrated data present -> initial render OK

    loop every intervalMs
        TQ->>Fetch: fetchIssuesClient(documentId, limit, environment)
        Fetch->>Route: GET /api/issues?documentId=X&limit=Y&environment=Z
        Route->>DA: getRecent(documentId, limit, environment)
        DA->>Mon: getIssues(connection.projectId, filters)
        Mon->>Ext: GET /api/0/organizations/{org}/issues/
        Ext-->>Mon: GlitchTipIssueDto[]
        Mon-->>DA: Issue[]
        DA-->>Route: IssueRow[]
        Route-->>Fetch: { data: IssueRow[] }
        Fetch-->>TQ: IssueRow[]
        TQ->>TQ: update cache + notify subscribers
        TQ-->>Panel: rerender with fresh data
    end
```

`intervalMs` comes from the selected project's Strapi `defaultConfig.refreshIntervalMs`, falling back to 30 000 ms. Each panel polls independently — there is no global tick.

## Path 3: switching project

Changing the header selector changes one Zustand value; every query key that embeds `documentId` refetches on its own.

```mermaid
sequenceDiagram
    participant User
    participant Selector as ProjectSelector
    participant Store as useSelectedProject (Zustand + persist)
    participant Active as useActiveProject
    participant Cfg as useProjectConfig
    participant Panels

    User->>Selector: pick another project
    Selector->>Store: setDocumentId(next)
    Store->>Store: persist to localStorage
    Store-->>Active: documentId changed
    Active->>Cfg: useProjectConfig(documentId)
    Cfg-->>Active: tool configurations + defaultConfig
    Active-->>Panels: { documentId, projectId, refreshIntervalMs }
    Note over Panels: new query keys → TanStack Query refetches each panel
```

No manual invalidation: the project id is part of every key, so the switch is just a cache miss.

## Path 4: on-demand fetch (issue detail)

A *user-triggered* fetch path: clicking an issue row opens the detail sheet and fetches its full payload (issue + latest event + recent events + comments).

```mermaid
sequenceDiagram
    participant User
    participant Panel as IssuesPanel
    participant Sheet as IssueDetailSheet
    participant Hook as useIssueDetail
    participant Route as /api/issues/[id]
    participant DA as IssuesDataAccess
    participant Mon as GlitchTipErrorMonitorStrategy
    participant Ext as GlitchTip API

    User->>Panel: click issue row
    Panel->>Panel: setSelectedIssueId(id)
    Panel->>Sheet: render with issueId
    Sheet->>Hook: useIssueDetail(documentId, issueId)
    Hook->>Hook: enabled = !!issueId, queryKey = detail(issueId)
    Hook->>Route: GET /api/issues/{id}?documentId=X
    Route->>DA: getDetail(documentId, id)

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

Issue endpoints are organization-scoped rather than project-scoped, so the detail calls take the issue id alone — but the route still requires `documentId` to resolve which GlitchTip instance to talk to.

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

The same split exists on the config side: `StrapiProject` DTOs → `projectMapper` → `Project` / `ProjectSummary` / `ToolConfiguration`.

## Error handling

API routes wrap their data-access calls and return `{ error: string }` with status `502` on failure. The TanStack Query hook receives the error; the panel renders an error state.

```mermaid
flowchart LR
    Mon[Strategy] -- throws --> DA[Data access]
    DA -- propagates --> Route[API route]
    Route -- 502 + { error } --> Hook[useQuery]
    Hook -- isError=true --> UI[Panel error state]
```

Common error sources:

- Missing `STRAPI_*` env var → `StrapiClientFactory` throws on the very first lookup.
- Project not mapped in admin → the resolver throws `No <X>Factory supports type "<strategy>"`.
- Project mapped but its tool configuration is incomplete → the configuration strategy throws, naming the missing fields.
- Missing provider secret → the abstract vendor factory throws when building the client.
- Provider 4xx/5xx → the HTTP client throws with status and a truncated body.
- Mapping failure (unexpected DTO shape) → throw in the mapper.

All of these surface as a 502 with the original message. Nothing is swallowed and no fallback masks a provider outage — the dashboard degrades visibly.

TanStack Query retries once (`retry: 1`) before surfacing the error.
