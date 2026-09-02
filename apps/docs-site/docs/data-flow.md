---
sidebar_position: 7
title: Data flow
---

# Data flow

This doc traces concrete request paths through the layers, so you can map any UI behavior back to its source. For the layered overview, see [architecture.md](architecture.md).

## The identifiers that travel

Three ids are in play, and two of them are called `documentId`:

| Id | Crosses to the browser? | Used for |
|---|---|---|
| project `documentId` | yes | the catalog, the cadence, the window presets, listing panels and strategies |
| panel `documentId` | yes | **every data route** and the whole monitor layer |
| provider project id | **never** | the URL of the provider call |

Data queries are keyed on the **panel** `documentId`: it is what the browser sends as `?documentId=`, what the data routes validate, and what the monitor layer resolves a factory from — because provider wiring lives on the panel ([panels.md](panels.md)). The **provider project id** (GlitchTip numeric id, PostHog project id) never leaves the server: it is read from the panel's tool configuration and handed to the strategy.

```mermaid
flowchart LR
    Browser -->|panel documentId| Route[API route]
    Route -->|panel documentId| DA[Data access]
    DA -->|panel documentId| Factory
    Factory -->|Strapi lookup| Conn[ToolConnection<br/>baseUrl, org, projectId]
    Conn -->|connection.projectId| Strategy
    Strategy -->|provider id in the URL| Ext[(Provider API)]
```

The config routes are the exception: `/api/config/projects/[projectId]` and its `panels` / `strategies` children take a **project** id (plus a panel *slug* for `strategies`).

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
    participant Get as getFamilyMonitor
    participant Factory
    participant Cfg as Tool configuration strategy
    participant Strapi

    DA->>Get: get<Family>Monitor(panelId)
    Get->>Factory: support(panelId, "<strategy>")
    Factory->>Cfg: isConfigure(panelId, "<strategy>", "<tool>")
    Cfg->>Strapi: GraphQL — isPanelHasStrategy (cached per request)
    Strapi-->>Cfg: strategies[]
    Cfg-->>Factory: true
    Get-->>DA: factory

    DA->>Factory: createConnection(panelId)
    Factory->>Cfg: resolveConnection(panelId)
    Cfg->>Strapi: GraphQL — getPanelById (cached per request)
    Strapi-->>Cfg: panel tool configuration
    Cfg-->>DA: { baseUrl, organizationSlug?, projectId }

    DA->>Factory: createStrategy(connection)
    Factory-->>DA: strategy (client built with the env secret)
```

Both Strapi lookups are wrapped in React `cache()`, so four widgets resolving the same panel during one render hit Strapi once per query, not four times.

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
    par
        Page->>Cfg: getProjectConfig(projects[0].documentId)
        Cfg-->>Page: Project
    and
        Page->>Cfg: getProjectPanels(projects[0].documentId)
        Cfg-->>Page: DashboardPanel[] sorted by order
    end
    Page->>Page: presetsFromTimeInterval(config.timeInterval)
    Page->>Page: resolveDefaultEnvironment()
    Page->>QC: setQueryData(configKeys.projects / project / pannels)

    Note over Page: initialPanel = panels[0] — the one the client will select
    Page->>Cfg: getProjectStrategies(projectId, initialPanel.slug)
    Cfg-->>Page: Strategy[]
    Page->>QC: setQueryData(issuesKeys.isConfig(projectId, env, slug))

    par prefetch, in parallel, only what the panel's strategies map
        Page->>QC: prefetchQuery(issuesKeys.recent(panelId, …))
        QC->>DA: getRecent(panelId, limit, environment)
        DA->>Mon: getIssues(connection.projectId, filters)
        Mon->>Ext: GET /api/0/organizations/{org}/issues/
        Ext-->>Mon: GlitchTipIssueDto[]
        Mon->>Mon: map to Issue[]
        Mon-->>DA: Issue[]
        DA->>DA: map to IssueRow[]
        DA-->>QC: IssueRow[]
    and
        Page->>QC: prefetchQuery(errorRateKeys.series(panelId, …))
        QC->>DA: getSeries(panelId, environment)
        DA->>Mon: getErrorStats(projectId, period=24h, environment)
        Mon-->>DA: TimeSeriesPoint[]
        DA-->>QC: ErrorRatePoint[]
    and
        Page->>QC: prefetchQuery(reservationsKeys.series(panelId, …))
        QC->>DA: getSeries(panelId, initialWindowMinutes)
        DA->>Mon: getLogs(projectId, { query: "reservation.sent" }, period)
        Mon-->>DA: Log[]
        DA-->>QC: ReservationPoint[]
    and
        Page->>QC: prefetchQuery(visitorsKeys.timeline(panelId, …))
        QC->>DA: getSeries(panelId, initialWindowMinutes)
        DA->>Mon: getActiveUsersTimeline(projectId, windowMinutes)
        Mon-->>DA: VisitorsTimeSeriesPoint[]
        DA-->>QC: VisitorPoint[]
    end

    Page->>Page: dehydrate(queryClient)
    Page-->>B: HTML + dehydrated state in HydrationBoundary
```

Key properties:

- **The widget queries are keyed on the panel id**, using the default panel resolved server-side — the first entry of `getProjectPanels()`, which Strapi sorts by `order`, and the same one `PannelSelector` selects when nothing is persisted. That is what makes the hydrated entries actually get read.
- **Only the widgets the panel's strategies map are prefetched.** The condition mirrors `DashboardContent`'s mapping; prefetching an unmapped widget would resolve no factory and throw on the server for nothing.
- **The panel list and the strategy list are seeded** with `setQueryData`, so the client resolves what to mount without a round-trip.
- The default environment and the initial window are resolved by shared, isomorphic helpers (`resolveDefaultEnvironment()`, `presetsFromTimeInterval()`) so the server and the client agree on those key segments. The window-scoped keys use `initialWindowMinutes`, the value `useDashboardWindow` holds after `hydrateFromStrapi` — not the env fallback.
- One early exit happens before any prefetch: no published project renders an explicit message instead of an empty dashboard. A project with no panel skips the prefetch entirely and renders an empty grid.

## Path 1b: what the client resolves after mount

The panel selection lives in the browser, so the *composition* of the dashboard is finalized after hydration — but every lookup it needs is already in the hydrated cache:

```mermaid
sequenceDiagram
    participant B as Browser
    participant Active as useActiveProject
    participant ActiveP as useActivePanel
    participant Content as DashboardContent
    participant TQ as Hydrated cache

    B->>Active: mount
    Active->>Active: persist.rehydrate() → stored project
    Active->>TQ: useProjects / useProjectConfig (hit)
    ActiveP->>ActiveP: persist.rehydrate() → stored panel
    ActiveP->>TQ: usePanels(projectId) (hit)
    ActiveP->>ActiveP: reconcile → stored panel, else panels[0]
    Content->>TQ: useProjectStrategy(projectId, slug) (hit)
    Content->>Content: mount the widgets those strategies allow
    Content->>TQ: each widget queries with the panel id (hit)
    Note over Content: no network on first paint<br/>polling takes over after intervalMs
```

Two cases turn those hits into a refetch, both harmless: a panel restored from `localStorage` that isn't `panels[0]` (the server prefetched for the first one), and a panel list changed in Strapi between the server render and the client's selection.

`useActivePanel` — not `PannelSelector` — is what runs this: the selector is only mounted in interactive mode, so a read-only kiosk would otherwise resolve no panel and mount no widget.

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

    Panel->>Hook: useIssues(panelId, limit, environment, intervalMs)
    Hook->>TQ: useQuery({ queryKey, queryFn, refetchInterval })
    TQ->>TQ: hydrated entry present -> initial render OK

    loop every intervalMs
        TQ->>Fetch: fetchIssuesClient(panelId, limit, environment)
        Fetch->>Route: GET /api/issues?documentId=panelId&limit=Y&environment=Z
        Route->>DA: getRecent(panelId, limit, environment)
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

`intervalMs` comes from the selected **project**'s Strapi `defaultConfig.refreshIntervalMs`, falling back to 30 000 ms. Each widget polls independently — there is no global tick.

## Path 3: switching project

Changing the header selector changes one Zustand value; everything downstream follows.

```mermaid
sequenceDiagram
    participant User
    participant Selector as ProjectSelector
    participant Store as useSelectedProject (Zustand + persist)
    participant Active as useActiveProject
    participant Cfg as useProjectConfig
    participant PanelSel as PannelSelector
    participant Widgets

    User->>Selector: pick another project
    Selector->>Store: setDocumentId(next)
    Store->>Store: persist to localStorage
    Store-->>Active: documentId changed
    Active->>Cfg: useProjectConfig(documentId)
    Cfg-->>Active: defaultConfig + timeInterval
    Active-->>PanelSel: new project documentId
    PanelSel->>PanelSel: usePanels(documentId) → configKeys.pannels(documentId)
    Note over PanelSel: new key → the new project's panels are fetched
    PanelSel-->>Widgets: panel selection updated
    Note over Widgets: new panel id → new query keys → refetch
```

No manual invalidation anywhere: the project id is part of the panel-list key and the panel id is part of every data key, so each switch is just a cache miss.

## Path 3b: switching panel

Same mechanism, one level down — and this is the switch that changes *which widgets exist*:

```mermaid
sequenceDiagram
    participant User
    participant Sel as PannelSelector
    participant Store as useSelectedPanel (Zustand + persist)
    participant Content as DashboardContent
    participant Strat as useProjectStrategy
    participant Widgets

    User->>Sel: pick another panel
    Sel->>Store: setPanelId + setPanelSlug + setPanelIcon
    Store->>Store: persist to localStorage
    Store-->>Content: pannelId / panelSlug changed
    Content->>Strat: useProjectStrategy(projectId, panelSlug, …)
    Strat-->>Content: Strategy[]
    Content->>Widgets: mount / unmount per strategy
    Note over Widgets: those that stay get a new panel id → refetch
```

A widget whose strategy is absent from the new panel is unmounted; its cache entry stays under the old panel id, so switching back is instant.

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
    Sheet->>Hook: useIssueDetail(panelId, issueId)
    Hook->>Hook: enabled = !!issueId, queryKey = detail(issueId)
    Hook->>Route: GET /api/issues/{id}?documentId=panelId
    Route->>DA: getDetail(panelId, id)

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

Issue endpoints are organization-scoped rather than project-scoped, so the detail calls take the issue id alone — but the route still requires the panel `documentId` to resolve which GlitchTip instance to talk to.

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
- **Feature type** — what a widget actually consumes (`IssueRow`, `ErrorRatePoint`). Lives in `src/app/features/<name>/domain/`.

If you find yourself importing a DTO outside its adapter folder, that's a leak. Add a mapper.

The same split exists on the config side: `StrapiProject` DTOs → `projectMapper` → `Project` / `ProjectSummary` / `DashboardPanel` / `ToolConfiguration`. One caveat specific to that side: `StrapiRepository.execute<T>()` is an unchecked cast, so a field missing from the GraphQL selection set arrives as `undefined` with no error — the DTO type says otherwise and nothing checks it at runtime.

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
- Panel not mapped in admin → the resolver throws `No <X>Factory supports type "<strategy>"`.
- Panel mapped but its tool configuration is incomplete → the configuration strategy throws, naming the missing fields.
- A **project** id sent where a **panel** id was expected → `Strapi panel "<id>" not found.`
- Missing provider secret → the abstract vendor factory throws when building the client.
- Provider 4xx/5xx → the HTTP client throws with status and a truncated body.
- Mapping failure (unexpected DTO shape) → throw in the mapper.

All of these surface as a 502 with the original message. Nothing is swallowed and no fallback masks a provider outage — the dashboard degrades visibly.

Two silent cases are deliberately *not* errors: a project with no panel and a panel with no strategy both return `data: null`, which renders an empty grid. Nothing was requested, so nothing failed.

TanStack Query retries once (`retry: 1`) before surfacing the error.
