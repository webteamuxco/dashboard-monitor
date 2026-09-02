---
sidebar_position: 3
title: Architecture
---

# Architecture

This document describes the overall architecture of `dashboard-monitor`: the layers, the boundaries, and the rationale.

For the deep dive on the Strategy/Factory pattern, see [monitors.md](monitors.md). For the unit that carries provider wiring, see [panels.md](panels.md). For end-to-end request traces, see [data-flow.md](data-flow.md).

## Goals

- **Provider-agnostic dashboard.** The UI should not know whether errors come from GlitchTip, Sentry, or anything else. Swapping providers must be a config change, not a refactor.
- **Multi-project, multi-panel, configured from an admin.** Which projects the kiosk can display, which panels each project offers, which tool backs each monitor of a panel, and each tool's connection details all live in Strapi — not in the codebase, not in the environment.
- **Server-only secrets.** API tokens (GlitchTip, PostHog, Strapi) must never leak to the browser bundle.
- **Snappy kiosk.** The dashboard auto-refreshes on a per-project interval and prefetches data server-side on first load.

## The monorepo

```mermaid
flowchart TB
    subgraph Repo[dashboard-monitor · pnpm + Turborepo]
        Dash["apps/dashboard<br/>package: dashboard-monitor<br/>Next.js 16 · port 3000"]
        Docs["apps/docs-site<br/>package: docs-site<br/>Docusaurus 3 · port 3002"]
        Tests["tests/ + vitest.config.ts<br/>at the repo ROOT<br/>@ → apps/dashboard/src"]
    end
    Turbo[turbo.json task graph] --> Dash
    Turbo --> Docs
    Tests -.covers.-> Dash
```

Every script (`dev`, `build`, `lint`, `typecheck`, `test`) is declared at the root and fans out through Turborepo. Two consequences worth remembering: the Vitest suite lives at the repo root rather than inside the app it tests, and `.env.local` belongs to `apps/dashboard/`.

## High-level context

```mermaid
flowchart LR
    User([User / Kiosk display])
    subgraph App[dashboard-monitor Next.js app]
        UI[UI / Features]
        API[API routes BFF]
        Monitors[Monitor layer<br/>Strategy + Factory]
        Config[Config layer<br/>Strapi client]
    end
    ST[(Strapi admin)]
    GT[(GlitchTip API)]
    PH[(PostHog API)]

    User -->|browser| UI
    UI -->|fetch /api/*| API
    API --> Monitors
    API --> Config
    Monitors -->|which tool? which URL?| Config
    Config -->|GraphQL + Bearer| ST
    Monitors -->|HTTP + Bearer| GT
    Monitors -->|HogQL| PH
```

The Next.js app is the only thing the user talks to. All external API calls are server-side. The browser never sees a GlitchTip, PostHog or Strapi token.

Strapi plays two distinct roles: it is the **catalog** (the projects the header lists, and the panels each project offers) and the **wiring table** (which adapter each monitor family loads for a given *panel*, and how to reach it).

## Project, panel, provider

The unit that carries wiring is the **dashboard panel**, not the project:

```mermaid
flowchart LR
    P["Project<br/>refresh cadence · window presets"] --> A["Panel: Production"]
    P --> B["Panel: Staging"]
    P --> C["Panel: Audience"]
    A --> A1[error-monitor × glitchtip]
    A --> A2[log-monitor × glitchtip]
    A --> A3[tracker-monitor × posthog]
    B --> B1[error-monitor × glitchtip<br/>another provider project]
    C --> C1[tracker-monitor × posthog]
```

The kiosk displays one panel at a time. Which widgets it mounts is derived from that panel's mapped strategies; which provider each widget talks to comes from that panel's tool configurations. [panels.md](panels.md) covers the model, the two Strapi ids in play, and the selection flow.

## Layered view

```mermaid
flowchart TB
    subgraph L1[1. UI Layer - features/]
        Panels[IssuesPanel / ErrorRatePanel<br/>ReservationsPanel / VisitorsPanel<br/>ProjectSelector · PannelSelector]
    end
    subgraph L2[2. Client state - hooks/ + state/]
        TQ[TanStack Query hooks<br/>useIssues, useErrorRate, useProjects,<br/>usePanels, useProjectStrategy, etc.]
        ZS[Zustand stores<br/>useSelectedProject, useSelectedPanel<br/>useDashboardWindow, useEnvironment]
    end
    subgraph L3[3. BFF - app/api/]
        Routes["/api/issues · /api/error-rate<br/>/api/reservations · /api/visitors/timeline<br/>/api/config/projects/ · .../panels · .../strategies"]
    end
    subgraph L4[4. Data access - features/.../data-access]
        DA[IssuesDataAccess · ErrorRateDataAccess<br/>ReservationsDataAccess · VisitorsTimelineDataAccess<br/>ConfigDataAccess]
    end
    subgraph L5[5. Monitor layer - lib/*Monitor]
        GetMon[getErrorMonitorFactory<br/>getLogMonitor · getTrackerMonitor]
        Resolver[Resolver]
        Factory[Factory]
        Strategy[Strategy interface]
        Adapter[Adapter implementations]
    end
    subgraph L6[6. Config layer - lib/config]
        CfgStrat[Tool configuration strategies]
        Strapi[StrapiRepository]
    end
    subgraph L7[7. HTTP clients - lib/tool/*]
        Clients[GlitchTipClient<br/>PostHogClient]
    end
    subgraph L8[8. External]
        Ext[(GlitchTip / PostHog)]
        Adm[(Strapi)]
    end

    Panels --> TQ
    Panels --> ZS
    TQ -->|fetch| Routes
    Routes --> DA
    DA --> GetMon
    GetMon --> Resolver
    Resolver --> Factory
    Factory --> Adapter
    Factory -->|support / createConnection| CfgStrat
    Adapter -.implements.-> Strategy
    Adapter --> Clients
    CfgStrat --> Strapi
    Strapi --> Adm
    Clients --> Ext
```

### Responsibilities per layer

Paths are relative to `apps/dashboard/`.

1. **UI Layer** (`src/app/features/*/ui/`) — pure React components. No `fetch`, no business logic. Reads data from TanStack Query hooks and UI state from Zustand.
2. **Client state** (`src/app/features/*/hooks/`, `src/app/features/dashboard/state/`) — TanStack Query for server data, Zustand for ephemeral UI state (selected project, selected panel, window, environment).
3. **BFF (Backend-For-Frontend)** (`src/app/api/*/route.ts`) — thin Next.js route handlers. Parse params, call the data access layer, return JSON. Marked `force-dynamic` (no caching).
4. **Data access** (`src/app/features/*/data-access/`) — server-only orchestrators. Resolve the factory for a panel `documentId`, compose monitor calls, map domain types to feature types (`IssueRow`, `ErrorRatePoint`, …). Wrapped in React `cache()` for request-level deduplication.
5. **Monitor layer** (`src/lib/{errorMonitor,logMonitor,trackerMonitor}/`) — the Strategy/Factory abstraction. See [monitors.md](monitors.md).
6. **Config layer** (`src/lib/config/`) — the Strapi seam: project catalog, dashboard panels, mapped tools, tool connections. Every lookup is memoized per request with React `cache()`.
7. **HTTP clients** (`src/lib/tool/glitchtip/`, `src/lib/tool/posthog/`) — low-level transport. Bearer auth, JSON parsing, pagination, error mapping.
8. **External APIs** — the providers and the admin.

## Server / client boundary

```mermaid
flowchart LR
    subgraph Browser[Browser]
        UI[UI components]
        TQ[TanStack Query]
    end
    subgraph Server[Node.js server]
        Routes[API routes]
        DA[Data access]
        Mon[Monitor layer]
        Cfg[Config layer]
    end
    UI --> TQ
    TQ -- fetch /api/*<br/>project + panel documentId, no secrets --> Routes
    Routes --> DA
    DA --> Mon
    Mon --> Cfg
    Cfg -- Bearer token --> Admin[(Strapi)]
    Mon -- Bearer token --> External[(External APIs)]
```

All monitor and config code is guarded by `import "server-only"` (see [GetErrorMonitor.ts:1](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/errorMonitor/GetErrorMonitor.ts#L1)). If a client component ever imports it by mistake, the build fails. Tokens never reach the bundle.

What crosses the boundary is Strapi `documentId`s — the selected project's and the selected panel's — plus the panel's `slug`, `icon` and `display_name`. All public identifiers. The provider project ids, instance URLs and organization slugs are resolved server-side from the panel id.

Variables prefixed `NEXT_PUBLIC_*` are intentionally non-sensitive: display-only knobs (window sizes, environment list, interactivity flag).

## Initial render path (kiosk first load)

The home page is a **Server Component** ([src/app/page.tsx](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/app/page.tsx)) that reads the project list from Strapi, picks the first project, resolves its window presets, prefetches the widget queries server-side, and hydrates the client.

```mermaid
sequenceDiagram
    participant Browser
    participant NextServer as Next.js server
    participant Cfg as ConfigDataAccess
    participant DA as Data Access
    participant Ext as GlitchTip / PostHog

    Browser->>NextServer: GET /
    NextServer->>Cfg: getProjectsList()
    Cfg-->>NextServer: ProjectSummary[]
    Note over NextServer: empty list → "no project configured" screen
    NextServer->>Cfg: getProjectConfig(firstDocumentId)
    Cfg-->>NextServer: Project (timeInterval, defaultConfig)
    NextServer->>Cfg: getProjectPanels(firstDocumentId)
    Cfg-->>NextServer: DashboardPanel[] by order
    Note over NextServer: presetsFromTimeInterval → window presets<br/>panels[0] → the panel to prefetch for
    NextServer->>Cfg: getProjectStrategies(firstDocumentId, panels[0].slug)
    Cfg-->>NextServer: Strategy[] → which widgets to prefetch

    par Prefetch in parallel — keyed on panels[0].id, gated by its strategies
        NextServer->>DA: getRecent(panelId, limit, environment)
        DA->>Ext: GET /api/0/organizations/{org}/issues/
        DA-->>NextServer: IssueRow[]
    and
        NextServer->>DA: getSeries(panelId, environment) [error rate]
        DA->>Ext: GET stats_v2
        DA-->>NextServer: ErrorRatePoint[]
    and
        NextServer->>DA: getSeries(panelId, initialWindowMinutes) [reservations]
        DA->>Ext: GET /api/0/organizations/{org}/logs/
        DA-->>NextServer: ReservationPoint[]
    and
        NextServer->>DA: getSeries(panelId, initialWindowMinutes) [visitors]
        DA->>Ext: HogQL query
        DA-->>NextServer: VisitorPoint[]
    end
    NextServer-->>Browser: HTML + dehydrated query cache
    Browser->>Browser: hydrate, mount React tree
    Browser->>Browser: rehydrate persisted project + panel selections
    Browser->>Browser: usePanels (hydrated) → reconcile panel → strategies (hydrated)
    Browser->>Browser: mount the panel's widgets on hydrated data, then poll
```

The project list, its config, its panel list and the default panel's strategy list are all seeded into the query cache with `setQueryData`, so the header selectors and the grid composition render without an extra round-trip.

After hydration, `useActiveProject` rehydrates the persisted selection from `localStorage`. Server render and first client render both start from the server-resolved project so the config query keys match; the stored project is applied right after mount. `useActivePanel` does the same for the panel — both hooks are called by `DashboardContent`, not by the header selectors, so a read-only kiosk resolves a project and a panel too.

The server plays along: it resolves the **default panel** (the first by `order` — what `PannelSelector` selects when nothing is persisted), seeds the panel and strategy lists into the cache, and prefetches the widget queries under *that panel's* id. So the client decides what to mount from hydrated data and reads hydrated data for each widget, without a network round-trip on first paint. Only the widgets the panel's strategies map are prefetched — the condition mirrors `DashboardContent`.

## Design rationale

### Why Strategy/Factory for monitors?

The product needs to be **independent of any single vendor**, and different projects may use different vendors at the same time. The Strategy interface fixes the contract from the data-access layer's perspective; the Factory localizes vendor-specific construction (connection lookup, client, secret) in one place. See [monitors.md](monitors.md) for the full pattern.

### Why Strapi instead of env vars for provider selection?

Env vars are per-deployment; the dashboard is per-panel. With `NEXT_PUBLIC_ERROR_MONITOR_DRIVER=glitchtip` the whole instance was locked to one vendor and one project. Moving the mapping into Strapi means a non-developer can add a project, add a panel to it, point that panel's error monitor at a different tool, and change the refresh cadence — without a deploy. Secrets stay in the environment because they must never transit through a CMS.

### Why panels rather than wiring the project directly?

Wiring used to live on the project, which made "project" and "view" the same thing: one project could show exactly one set of widgets, from one set of provider projects. Real setups don't fit that — the same product wants a production view, a staging view pointed at another GlitchTip project, and an audience-only view.

Panels split the two concerns. The project keeps what is genuinely global to it (refresh cadence, window presets); the panel owns the wiring and the widget composition. The kiosk shows one panel at a time and the header switches between them. The cost is the [two-identifier ambiguity](panels.md#the-two-identifiers): the monitor layer's `documentId` is now a panel id while the config routes still take a project id, and both parameters share a name.

### Why a BFF instead of calling monitors from Server Components directly?

Two reasons:

1. **Client-side polling.** TanStack Query needs an HTTP endpoint to poll. Server Components don't expose one.
2. **Clean cache invalidation.** Each query key maps to one route, which gives a clear story for `invalidateQueries`.

Server Components still do the **initial prefetch** (no extra round-trip on first paint), and TanStack Query handles **everything after** via the BFF.

### Why force-dynamic everywhere?

The dashboard is real-time. Stale data is worse than a slightly slower response. Next.js's default caching would serve hour-old data; `dynamic = "force-dynamic"` opts out. Latency-critical optimization happens at the TanStack Query layer (staleTime, polling interval) and at the React `cache()` layer (per-request dedup of Strapi lookups) instead.

### Why Zustand and TanStack Query both?

They solve different problems:

- **TanStack Query** owns *server state*: cache, invalidation, polling, retry. Anything that came from an API.
- **Zustand** owns *UI state*: selected project, selected panel, selected window size, selected environment. Things that never round-trip to the server.

Mixing the two responsibilities into one tool creates ceremony around what should be trivial. See [state-management.md](state-management.md).

## Extension points

The places you should look first when adding a feature (paths relative to `apps/dashboard/`):

- **New external provider** → new abstract vendor factory + adapter under `src/lib/<family>/adapters/<provider>/`, then map the tool to a **panel** in Strapi (see [monitors.md](monitors.md)).
- **New data view** → new feature folder under `src/app/features/<name>/`, with `data-access/`, `domain/`, `hooks/`, `ui/`, `queryKeys.ts`. Wire a new route under `src/app/api/<name>/route.ts`, and mount the widget from `DashboardContent`'s strategy mapping.
- **New monitor family** (e.g. "uptime") → mirror the structure of `src/lib/errorMonitor/`: `strategy/`, `factory/`, `adapters/`, `Get<Name>Monitor.ts`, a new `STRATEGY_RESOLVER` added to `src/lib/shared/strategiesEnum.ts` and declared in Strapi.
- **New project-level setting** (applies to every panel) → extend the Strapi project schema, `ProjectDto`, the `GetProjectById` selection set, `mapProject`, then read it through `ConfigDataAccess.getProjectConfig`.
- **New panel-level setting** (differs between views) → same, but on `DashboardPanelDto`, `mapDashboardPanel` and the two panel queries in `gql/panels/`.
- **New documentation page** → add it under `apps/docs-site/docs/` with a `sidebar_position`; the sidebar is autogenerated from the folder.
