---
sidebar_position: 7
title: Data flow
---

# Data flow

This doc traces concrete request paths through the layers, so you can map any UI behavior back to its source. For the layered overview, see [architecture.md](architecture.md).

## The identifiers that travel

Four values are in play, and three of them are called `documentId` somewhere:

| Id | Crosses to the browser? | Used for |
|---|---|---|
| project `documentId` | yes | the catalog, the cadence, the window presets, listing panels |
| panel `slug` | yes | listing that panel's KPIs and blocks |
| element `documentId` (a KPI's, a block's) | yes | **every data route** and the whole monitor layer |
| provider project id | **never** | the URL of the provider call |

Measures are keyed on the **element** `documentId`: it is what the browser puts in the path, what the data routes validate, and what the data-access layer turns into a `ToolWiring` — because provider wiring lives on the element ([panels.md](panels.md)). The **provider project id** (GlitchTip numeric id, PostHog project id) never leaves the server: it is read from the element's tool configuration and handed to the strategy.

```mermaid
flowchart LR
    Browser -->|element documentId| Route[API route]
    Route -->|kind + documentId| DA[Data access]
    DA -->|loadToolWiring| Wiring[ToolWiring<br/>strategy + configuration]
    Wiring --> Factory
    Factory --> Conn[ToolConnection<br/>baseUrl, org, provider projectId]
    Conn -->|connection.projectId| Strategy
    Strategy -->|provider id in the URL| Ext[(Provider API)]
```

The config routes are the exception: `/api/config/projects/[projectId]` and its `panels` child take a **project** id, and the two element lists take a panel **slug**.

## The two flavors of request

There are two distinct fetch paths in this app:

1. **Server prefetch** — runs once per page load, inside the Server Component. It seeds the *configuration* queries so the chrome renders without a round-trip.
2. **Client polling** — runs in the browser, on a timer, after hydration. This is what fills and refreshes every card.

Both paths go through the *same* data-access layer; the difference is only who calls it.

```mermaid
flowchart LR
    subgraph SSR[Server-side - first paint]
        Page[page.tsx<br/>Server Component]
        QC[setQueryData: catalog, config, panels]
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

## Path 0: resolving the monitor for an element

Every measure starts with the same four steps. They are shown once here and elided in the sequences below.

```mermaid
sequenceDiagram
    participant DA as Data Access
    participant Load as loadToolWiring
    participant Strapi
    participant Get as get<Family>Monitor
    participant Factory
    participant Cfg as Tool configuration strategy

    DA->>Load: loadToolWiring(kind, documentId)
    Load->>Strapi: GraphQL — the element's strategy + tool (cached per request)
    Strapi-->>Load: dashboardKpi / dashboardBlock
    Load-->>DA: ToolWiring { id, strategy?, configuration? }

    DA->>Get: get<Family>Monitor(wiring)
    Get->>Factory: support(wiring, "<strategy>")
    Factory->>Cfg: isConfigure(wiring, "<strategy>")
    Note over Cfg: pure — no network, no env
    Cfg-->>Factory: true
    Get-->>DA: factory

    DA->>Factory: createConnection(wiring)
    Factory-->>DA: { baseUrl, organizationSlug?, projectId }

    DA->>Factory: createStrategy(connection)
    Factory-->>DA: strategy (client built with the env secret)
```

Only the first step touches Strapi, and it is wrapped in React `cache()`, so several cards resolving the same element during one request read it once. Everything below `get<Family>Monitor` is pure and synchronous — that is the invariant that lets the monitor layer stay unaware of Strapi entirely.

## Path 1: server prefetch on first load

```mermaid
sequenceDiagram
    participant B as Browser
    participant Page as page.tsx (Server Component)
    participant Cfg as ConfigDataAccess
    participant QC as QueryClient (server)

    B->>Page: GET /
    Page->>Cfg: getProjectsList()
    Cfg-->>Page: ProjectSummary[]
    Note over Page: empty → "no project configured" screen
    Page->>Page: readDevelopmentPanelParam(searchParams)
    par
        Page->>Cfg: getProjectConfig(projects[0].documentId)
        Cfg-->>Page: Project (defaultConfig, timeInterval)
    and
        Page->>Cfg: getProjectPanels(projects[0].documentId, showDev)
        Cfg-->>Page: DashboardPanel[] sorted by order
    end
    Page->>Page: presetsFromTimeInterval(config.timeInterval)
    Page->>QC: setQueryData(configKeys.projects())
    Page->>QC: setQueryData(configKeys.project(id))
    Page->>QC: setQueryData(configKeys.pannels(id, showDev))
    Page->>Page: dehydrate(queryClient)
    Page-->>B: HTML + dehydrated state in HydrationBoundary
```

Key properties:

- **Only the configuration is seeded.** The measures are not prefetched: a panel's elements are only known once a panel is selected, and the selection is a client concern. So the header, the presets and the panel list are on the first paint; each card fetches its own measure on mount, then polls.
- **The window presets are resolved by a shared isomorphic helper** (`presetsFromTimeInterval`) so the server and the client agree on the initial window — `initialWindowMinutes` is what `useDashboardWindow` holds after `hydrateFromStrapi`, not the env fallback.
- **The dev-panel flag is part of the panel-list key** on both sides, read through the same `readDevelopmentPanelParam` helper.
- One early exit happens before anything else: no published project renders an explicit message instead of an empty dashboard.

## Path 1b: what the client resolves after mount

The panel selection lives in the browser, so the *composition* of the dashboard is finalized after hydration:

```mermaid
sequenceDiagram
    participant B as Browser
    participant Active as useActiveProject
    participant Win as useActiveWindow
    participant ActiveP as useActivePanel
    participant Content as DashboardContent
    participant TQ as Hydrated cache

    B->>Active: mount
    Active->>Active: persist.rehydrate() → stored project
    Active->>TQ: useProjects / useProjectConfig (hit)
    Win->>TQ: useProjectConfig(documentId) (hit)
    Win->>Win: presets ← timeInterval, keep the selected window if offered
    ActiveP->>ActiveP: persist.rehydrate() → stored panel
    ActiveP->>TQ: usePanels(projectId, showDev) (hit)
    ActiveP->>ActiveP: reconcile → stored slug, else panels[0], else clear
    Content->>Content: PanelKpi(panelSlug) · PanelBlock(panelSlug)
    Content->>Content: element lists fetch, then one card per element
    Note over Content: each card fetches its measure, then polls at intervalMs
```

`useActivePanel` — not `PannelSelector` — is what runs this: the selector is only mounted in interactive mode, so a read-only kiosk would otherwise resolve no panel and render nothing.

## Path 2: client polling (a block measure)

```mermaid
sequenceDiagram
    participant Card as BlockCard
    participant Hook as useBlock
    participant TQ as TanStack Query cache
    participant Fetch as fetchBlockMeasureClient
    participant Route as /api/blocks/[blockId]
    participant DA as BlocksDataAccess
    participant Mon as GlitchTipLogMonitorStrategy
    participant Ext as GlitchTip API

    Card->>Hook: useBlock(blockId, windowMinutes, environment, limit, tagId, intervalMs)
    Hook->>TQ: useQuery({ queryKey, queryFn, refetchInterval })

    loop every intervalMs
        TQ->>Fetch: fetchBlockMeasureClient(blockId, window, env, limit, tag)
        Fetch->>Route: GET /api/blocks/{blockId}?windowMinutes&limit&environment&tag
        Route->>DA: getMeasure(DASHBOARD_BLOCK, blockId, window, env, limit, tag)
        Note over DA: Path 0 — wiring, factory, connection, strategy
        DA->>Mon: getLogs(connection.projectId, { query }, period)
        Mon->>Ext: GET /api/0/organizations/{org}/logs/
        Ext-->>Mon: GlitchTipLogDto[]
        Mon-->>DA: Log[]
        DA->>DA: bucket + zero-fill → SeriesBlockMeasure
        DA-->>Route: BlockMeasure
        Route-->>Fetch: { data: BlockMeasure }
        Fetch-->>TQ: BlockMeasure
        TQ-->>Card: rerender with fresh data
    end
```

`intervalMs` comes from the selected **project**'s Strapi `defaultConfig.refreshIntervalMs`, falling back to 30 000 ms, and is threaded down as a prop. Each card polls independently — there is no global tick. A KPI follows the identical path through `/api/kpis/[kpiId]` and `KpisDataAccess`, returning a `KpiMeasure` instead.

## Path 3: switching project

Changing the header selector changes one Zustand value; everything downstream follows.

```mermaid
sequenceDiagram
    participant User
    participant Selector as ProjectSelector
    participant Store as useSelectedProject (Zustand + persist)
    participant Active as useActiveProject
    participant Win as useActiveWindow
    participant ActiveP as useActivePanel
    participant Cards

    User->>Selector: pick another project
    Selector->>Store: setDocumentId(next)
    Store->>Store: persist to localStorage
    Store-->>Active: documentId changed
    Active->>Active: useProjectConfig(next) → new cadence
    Win->>Win: same config → re-apply presets, keep the window if offered
    ActiveP->>ActiveP: usePanels(next) → new key, new list
    ActiveP->>ActiveP: reconcile → panels[0], or clearPanel() when empty
    ActiveP-->>Cards: new panelSlug
    Note over Cards: new slug → element lists are a cache miss<br/>new element ids → every measure key is too
```

No manual invalidation anywhere: the project id is part of the panel-list key, the panel slug part of the element-list keys, and the element id part of every measure key. Each switch is just a cache miss.

Two things that are *not* automatic and needed explicit handling: the window presets, which live in a Zustand store rather than in a query (hence `useActiveWindow`), and the panel selection when the next project has no panel at all (hence `clearPanel()`).

## Path 3b: switching panel

Same mechanism, one level down — and this is the switch that changes *which cards exist*:

```mermaid
sequenceDiagram
    participant User
    participant Sel as PannelSelector
    participant Store as useSelectedPanel (Zustand + persist)
    participant Content as DashboardContent
    participant Lists as PanelKpi / PanelBlock
    participant Cards

    User->>Sel: pick another panel
    Sel->>Store: setPanelId + setPanelSlug + setPanelIcon
    Store->>Store: persist to localStorage
    Store-->>Content: panelSlug changed
    Content->>Lists: useDashboardKpis(slug) · useDashboardBlock(slug)
    Lists-->>Cards: mount one card per element of the new panel
    Note over Cards: the previous panel's entries stay cached<br/>under its own slug → switching back is instant
```

## Path 4: on-demand fetch (issue detail)

A *user-triggered* path: clicking a row in a `list` block opens the detail sheet and fetches its full payload (issue + latest event + recent events + comments).

```mermaid
sequenceDiagram
    participant User
    participant List as BlockList
    participant Sheet as IssueDetailSheet
    participant Hook as useIssueDetail
    participant Route as /api/blocks/[blockId]/issues/[issueId]
    participant DA as IssuesDataAccess
    participant Mon as GlitchTipErrorMonitorStrategy
    participant Ext as GlitchTip API

    User->>List: click issue row
    List->>List: setSelectedIssueId(id)
    List->>Sheet: render with blockId + issueId
    Sheet->>Hook: useIssueDetail(blockId, issueId)
    Hook->>Hook: enabled = !!issueId, queryKey = detail(issueId)
    Hook->>Route: GET /api/blocks/{blockId}/issues/{issueId}
    Route->>DA: getDetail(DASHBOARD_BLOCK, blockId, issueId)

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

Issue endpoints are organization-scoped rather than project-scoped, so the detail calls take the issue id alone — but the route still requires the **block** `documentId` to resolve which GlitchTip instance to talk to. The sheet is only reachable when the block's entries are issues (`measure.hasDetail`) and the dashboard is interactive.

Posting a comment goes through `POST /api/blocks/[blockId]/issues/[issueId]/comments` and invalidates `["issues", "detail", issueId]`, so the sheet re-reads the thread it just wrote to.

## DTO → domain mapping

Every external response goes through a Mapper before reaching the data access layer. This is what keeps the rest of the codebase provider-agnostic.

```mermaid
flowchart LR
    Raw[Raw HTTP JSON] -->|GlitchTipClient.get| DTO[GlitchTipIssueDto<br/>provider shape]
    DTO -->|mapGlitchTipIssue| Domain[Issue<br/>our domain]
    Domain -->|in DataAccess| Feature[IssueRow / BlockListEntry<br/>UI-ready shape]
```

Three shapes, three responsibilities:

- **DTO** — verbatim mirror of the provider's response. Lives in `adapters/<provider>/dto/`.
- **Domain** — our internal monitor-family type (`Issue`, `Log`, `ErrorStatsSeries`, `VisitorsTimeSeriesPoint`). Lives in `src/lib/<family>/domain/`.
- **Feature type** — what a card actually consumes (`BlockMeasure`, `KpiMeasure`, `IssueDetailView`). Lives in `src/app/features/<name>/domain/`.

If you find yourself importing a DTO outside its adapter folder, that's a leak. Add a mapper.

The same split exists on the config side: `StrapiProject` / `StrapiDashboardKpi` / `StrapiTool` DTOs → the mappers in `config/domain/mappers/` → `Project` / `DashboardPanel` / `DashboardKpi` / `ToolWiring`. One caveat specific to that side: `AbstractStrapiRepository.execute<T>()` is an unchecked cast, so a field missing from the GraphQL selection set arrives as `undefined` with no error — the DTO type says otherwise and nothing checks it at runtime. That is exactly how the window presets silently fell back to their defaults once, after `timeInterval` was dropped from `GetProjectById`.

## Error handling

API routes wrap their data-access calls and return `{ error: string }` with status `502` on failure. The TanStack Query hook receives the error; the card renders an error state — and only that card.

```mermaid
flowchart LR
    Mon[Strategy] -- throws --> DA[Data access]
    DA -- propagates --> Route[API route]
    Route -- 502 + { error } --> Hook[useQuery]
    Hook -- isError=true --> UI[Card error state]
```

Common error sources:

- Missing `STRAPI_*` env var → `StrapiClientFactory` throws on the very first lookup.
- An id that belongs to another collection, or an unpublished element → `Strapi dashboard-kpi "<id>" not found.` (the message names the collection that was searched).
- An element with no strategy → `Strapi dashboard-block "<id>" declares no strategy. Map one in admin.`
- Strategy and tool disagreeing (e.g. `tracker-monitor` on a GlitchTip tool) → the resolver throws `No <X>Factory supports type "<strategy>"`.
- An incomplete tool configuration → `resolveConnection` throws, naming what is missing (a null organization on GlitchTip is the usual one).
- A log-monitor element with no tag, or a `?tag=` the element does not declare → an explicit throw before any provider call.
- Missing provider secret → the abstract vendor factory throws when building the client.
- Provider 4xx/5xx → the HTTP client throws with status and a truncated body.
- Mapping failure (unexpected DTO shape, or Strapi's own `Error` type in a dynamic zone) → throw in the mapper.

All of these surface as a 502 with the original message, scoped to the one card whose element is misconfigured. Nothing is swallowed and no fallback masks a provider outage — the dashboard degrades visibly.

Three silent cases are deliberately *not* errors: a project with no panel, a panel with no element, and an unwindowed card asking for a list. Nothing was requested, so nothing failed.

TanStack Query retries once (`retry: 1`) before surfacing the error.
