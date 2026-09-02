---
sidebar_position: 8
title: State management
---

# State management

`dashboard-monitor` uses two state libraries with **clearly separated responsibilities**:

- **TanStack Query** — server state (anything fetched from an API, including the Strapi project config and the panel list)
- **Zustand** — UI state (what the user selects: project, panel, window, environment)

Mixing them creates redundancy. Keeping them apart keeps each layer thin.

```mermaid
flowchart LR
    subgraph Server[Server state - TanStack Query]
        Projects[useProjects]
        Config[useProjectConfig]
        PanelsQ[usePanels]
        Strat[useProjectStrategy]
        Issues[useIssues]
        Detail[useIssueDetail]
        Rate[useErrorRate]
        Resa[useReservations]
        Vis[useVisitorsTimeline]
    end
    subgraph UI[UI state - Zustand]
        Sel[useSelectedProject<br/>documentId - persisted]
        SelP[useSelectedPanel<br/>pannelId + panelSlug + panelIcon - persisted]
        Win[useDashboardWindow<br/>presets + windowMinutes]
        Env[useEnvironment<br/>environment]
        Local[Local component state<br/>e.g. selectedIssueId]
    end
    subgraph Bridge[Bridge]
        Active[useActiveProject]
        ActiveP[useActivePanel]
    end
    Sel --> Active
    Projects --> Active
    Config --> Active
    Active -->|project documentId, intervalMs| ActiveP
    PanelsQ --> ActiveP
    ActiveP <--> SelP
    SelP -->|panelSlug| Strat
    Strat -->|which widgets| Widgets[Widgets]
    SelP -->|panel documentId| Issues
    Issues --> Widgets
    Win --> Widgets
    Env --> Widgets
    Local --> Widgets
```

The chain is: *project selection* → its panels → *panel selection* → its strategies → the widgets, each keyed on the panel id.

## TanStack Query — server state

### Setup

[src/app/providers.tsx](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/app/providers.tsx):

```typescript
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
```

Mounted in [src/app/layout.tsx](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/app/layout.tsx) via `<Providers>`.

- **`staleTime: 30s`** — data is considered fresh for 30s after fetch. Re-renders don't trigger a refetch within that window.
- **`refetchOnWindowFocus: false`** — the kiosk has no "focus events" — polling is enough.
- **`retry: 1`** — one retry on failure, then surface the error.

### Per-feature hooks

Each feature exports a single hook. They all follow the same shape:

```typescript
// hooks/useIssues.ts
export function useIssues(
  documentId: string, // the selected panel's Strapi documentId
  limit: number,
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: issuesKeys.recent(documentId, limit, environment),
    queryFn: () => fetchIssuesClient(documentId, limit, environment),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
```

`intervalMs` is threaded down from `DashboardContent` so all widgets share the same cadence, taken from the selected **project**'s Strapi `defaultConfig.refreshIntervalMs` (fallback: 30 000 ms) — the cadence is project-wide, the data is panel-scoped.

Hooks that depend on a selection that only exists after mount are gated with `enabled`:

```typescript
export function useProjectStrategy(
  documentId: string,      // project id
  selectedPanel: string | null, // panel slug
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: [...issuesKeys.isConfig(documentId, environment), selectedPanel],
    queryFn: () => fetchProjectStrategy(documentId, selectedPanel!),
    enabled: !!documentId && !!selectedPanel,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
```

The three config hooks are the exception on cadence — they use `staleTime: 5 * 60_000` and no polling, because the catalog barely moves:

```typescript
export function useProjectConfig(documentId: string) {
  return useQuery({
    queryKey: configKeys.project(documentId),
    queryFn: () => fetchProjectConfigClient(documentId),
    staleTime: 5 * 60_000,
    enabled: Boolean(documentId),
  });
}
```

### Query keys

Each feature owns a `queryKeys.ts` file. This avoids stringly-typed keys scattered across the codebase.

```typescript
// features/issues/queryKeys.ts
export const issuesKeys = {
  recent: (documentId: string, limit: number, environment: string | null = null) =>
    ["issues", "recent", documentId, limit, environment] as const,
  detail: (issueId: string) =>
    ["issues", "detail", issueId] as const,
};
```

Inventory (the id column says *which* Strapi id the key embeds):

| Key | Shape | Id |
|---|---|---|
| `configKeys.projects()` | `["config", "projects"]` | — |
| `configKeys.project(id)` | `["config", "project", id]` | project |
| `configKeys.pannels(id)` | `["config", "pannels", id]` | project |
| `issuesKeys.isConfig(id, env, panelSlug)` | `["issues", "isConfig", id, env, panelSlug]` | project + panel slug |
| `issuesKeys.recent(id, limit, env)` | `["issues", "recent", id, limit, env]` | panel |
| `issuesKeys.detail(issueId)` | `["issues", "detail", issueId]` | — (provider issue id) |
| `errorRateKeys.series(id, env)` | `["errorRate", "series", id, env]` | panel |
| `reservationsKeys.series(id, win, env)` | `["reservations", "series", id, win, env]` | panel |
| `visitorsKeys.timeline(id, win)` | `["visitors", "timeline", id, win]` | panel |

Two rules:

1. **Keep keys structural** (constants → variables, broad to narrow). `queryClient.invalidateQueries({ queryKey: ["issues"] })` invalidates *all* issues queries; `["issues", "recent"]` only the list; `["issues", "recent", panelId]` only that panel.
2. **The id is the first variable segment** of every data key. That is what makes a project *or panel* switch a plain cache miss instead of a manual invalidation. `configKeys.pannels(documentId)` carries the project id for exactly that reason: without it, switching project served the previous project's panel list until the 5-minute `staleTime` expired.

`issuesKeys.isConfig(documentId, environment, panelSlug)` takes the panel slug as its third variable segment rather than letting the hook append it. That keeps the key constructible from one place — which is what lets the server prefetch seed it.

### Hydration from server

[src/app/page.tsx](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/app/page.tsx) seeds the config queries with `setQueryData`, prefetches the four widget queries in parallel using a server-side `QueryClient`, then dehydrates the cache and wraps children in `<HydrationBoundary state={...}>`. See [data-flow.md](data-flow.md).

**The keys must match exactly across the boundary.** The server resolves the environment with `resolveDefaultEnvironment()` and the window with `presetsFromTimeInterval()`; the client stores start from the same values. Diverging here doesn't break anything visibly — it just silently refetches everything on mount, which defeats the prefetch.

Because the widget queries are keyed on the **panel** id, the server resolves the default panel (first by `order`) before prefetching, and seeds the panel list and the strategy list too. The client can then pick its panel and mount its widgets entirely from hydrated data. See [panels.md](panels.md#the-server-prefetch-resolves-the-default-panel).

## Zustand — UI state

Four stores, each scoped to one concern.

### useSelectedProject

[src/app/features/dashboard/state/useSelectedProject.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/app/features/dashboard/state/useSelectedProject.ts)

```typescript
export const useSelectedProject = create<SelectedProjectStore>()(
  persist(
    (set) => ({
      documentId: null,
      setDocumentId: (documentId) => set({ documentId }),
    }),
    { name: "dashboard-selected-project", skipHydration: true },
  ),
);
```

- **State:** `{ documentId: string | null }`
- **Action:** `setDocumentId(documentId)`
- **Persistence:** `localStorage` key `dashboard-selected-project`, with **`skipHydration: true`**

`skipHydration` is deliberate: the server render and the first client render must both start from `null` so they fall back to the server-resolved project and the prefetched query keys still match. `useActiveProject` calls `persist.rehydrate()` in an effect after mount, then reconciles: if the stored project no longer exists in the catalog, it falls back to the initial one.

### useSelectedPanel

[src/app/features/dashboard/state/useSelectedPanel.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/app/features/dashboard/state/useSelectedPanel.ts)

```typescript
export const useSelectedPanel = create<SelectedPanelStore>()(
  persist(
    (set) => ({
      panelSlug: null,
      pannelId: "",
      panelIcon: "panels-right-bottom",
      setPanelId: (pannelId) => set({ pannelId }),
      setPanelSlug: (panelSlug) => set({ panelSlug }),
      setPanelIcon: (panelIcon) => set({ panelIcon }),
    }),
    { name: "dashboard-selected-pannel", skipHydration: true },
  ),
);
```

- **State:** `{ panelSlug: string | null, pannelId: string, panelIcon: string | null }`
- **Actions:** `setPanelId`, `setPanelSlug`, `setPanelIcon` — always called together
- **Persistence:** `localStorage` key `dashboard-selected-pannel`, `skipHydration: true`

The three values are the selection, not server data: `pannelId` keys every data query, `panelSlug` keys the strategy query, `panelIcon` is what the selector renders.

`useActivePanel` owns them, mirroring `useActiveProject`: it calls `persist.rehydrate()` after mount, then reconciles the stored slug against the project's panel list — selecting the first panel by `order` when nothing matches, and re-resolving the id when the stored slug belongs to another project (two projects can both have a `production` panel). `PannelSelector` only writes user changes; it is mounted solely in interactive mode, so resolution cannot live there or a read-only kiosk would mount no widget at all.

Note the `pannel` spelling on the id field, the store's `localStorage` key, `configKeys.pannels()` and three file names. It is a typo that became load-bearing — renaming it resets every kiosk's persisted selection, so it belongs in its own commit. See [panels.md](panels.md#naming-trap-panel-vs-pannel).

### useDashboardWindow

[src/app/features/dashboard/state/useDashboardWindow.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/app/features/dashboard/state/useDashboardWindow.ts)

- **State:** `{ presets: WindowPreset[], windowMinutes: number }`
- **Actions:** `setWindowMinutes(minutes)`, `hydrateFromStrapi(presets, windowMinutes)`
- **Persistence:** none (in-memory only)
- **Defaults:** presets `30m / 1h / 12h / 24h`, initial window from `NEXT_PUBLIC_DASHBOARD_RESERVATIONS_WINDOW_MINUTES` (or 30)

The defaults are only a fallback: `DashboardContent` calls `hydrateFromStrapi()` with the presets derived from the selected project's `timeInterval[]`, resolved server-side by `presetsFromTimeInterval()`. A project declaring `{ duration: 6, interval: "hours" }` gets a `6h` preset.

`hydrateFromStrapi` runs once, inside a `useState` initializer, so it applies the server-resolved values before the first paint without an effect. If the store shows the 30m/1h/12h/24h defaults on a project that *does* declare intervals, the value never made it out of Strapi: check that `GetProjectById` still selects `timeInterval { duration interval }` — the DTO cast won't tell you.

Also exports `isDashboardInteractive()` — reads `NEXT_PUBLIC_DASHBOARD_INTERACTIVITY`. Used to hide the selectors on read-only kiosks.

The reservations and visitors hooks subscribe to `windowMinutes` to refetch when the user picks a new preset.

### useEnvironment

[src/app/features/dashboard/state/useEnvironment.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/app/features/dashboard/state/useEnvironment.ts)

- **State:** `{ environment: string | null }` — `null` means "all environments"
- **Action:** `setEnvironment(environment)`
- **Persistence:** none
- **Default:** `resolveDefaultEnvironment()`, the same isomorphic helper the server prefetch uses

Feeds the issues, error rate and reservations query keys.

### Local component state

Anything truly scoped to a single component stays in `useState`. Example: `selectedIssueId` in `IssuesPanel` drives the detail sheet open/closed — no other component needs to know about it.

Rule of thumb: lift to Zustand only when two unrelated components need the same state.

## Decision matrix

```mermaid
flowchart TD
    Q[New piece of state]
    Q -->|came from an API| TQ[TanStack Query]
    Q -->|per-project or per-panel setting| Strapi[Strapi + ConfigDataAccess]
    Q -->|set by user input or UI logic| UI{Where is it used?}
    UI -->|one component| Local[useState]
    UI -->|multiple components| Persist{Survive reload?}
    Persist -->|yes| Zus[Zustand + persist]
    Persist -->|no| ZusE[Zustand, no persist]
```

## Common operations

### Trigger a manual refresh

```typescript
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: issuesKeys.recent(documentId, limit, environment) });
```

### Force refetch on a specific event

If the user changes `windowMinutes`, the environment, the project or the panel, the affected hooks re-run automatically because those values are part of their query keys. No manual invalidation needed.

### Reset the persisted selections

```javascript
localStorage.removeItem("dashboard-selected-project");
localStorage.removeItem("dashboard-selected-pannel");
```

Or programmatically: `useSelectedProject.persist.clearStorage()` / `useSelectedPanel.persist.clearStorage()`.

## Conventions to follow

- **Don't call `fetch` directly in components.** Always go through a hook.
- **Don't put server data in Zustand.** TanStack Query already does caching, dedup, and staleness — duplicating that in a store creates two sources of truth. The selected project and panel are *choices* (Zustand); their config, panel list and strategies are *data* (TanStack Query).
- **Don't subscribe to the whole store when you only need one slice.** Use a selector: `useDashboardWindow((s) => s.windowMinutes)`.
- **Always use the centralized `queryKeys` factory** — never inline `["issues", documentId]` in a component.
- **Anything resolved on both sides of the hydration boundary lives in one shared helper** (`environments.ts`, `windowPresets.ts`), never duplicated.
