# src/app/features — Feature modules

Each subfolder is a self-contained feature (issues, errorRate, reservations, visitors, dashboard, config). Features compose UI, client hooks, server-side data access, and view-model types.

## Layout

```
src/app/features/<feature>/
├── ui/                # React components (".tsx"). May be "use client".
├── hooks/             # TanStack Query hooks (one per data view)
├── data-access/       # Server-only orchestrators (import "server-only") + client fetchers
├── domain/            # UI-shaped view models (e.g. IssueRow, IssueDetailView)
└── queryKeys.ts       # Query key factory for the feature
```

Not every feature uses every folder, but the names are fixed — don't invent new ones.

## Which id a feature receives

Two Strapi ids circulate in this folder and both are called `documentId` in most signatures:

- **project `documentId`** — the `config` feature and `dashboard`'s own hooks (`useActiveProject`, `usePanels`, `useProjectStrategy`). It resolves the catalog, the refresh cadence, the window presets, the panel list.
- **panel `documentId`** — *every data feature* (`issues`, `errorRate`, `reservations`, `visitors`). `DashboardContent` reads it from `useSelectedPanel().pannelId` and passes it as the `documentId` prop of each widget, which forwards it to its hook, its client fetcher, its route, and finally to `get<Family>Monitor()`.

So `useIssues(documentId, …)` wants a **panel** id, while `useProjectConfig(documentId)` wants a **project** id. Check where the value came from before threading it somewhere new — see the root [CLAUDE.md](../../../../../CLAUDE.md#the-panel-system--read-this-before-touching-any-data-path).

## Layer rules

### `ui/` — components

- React only. No `fetch`. No env reads (the header is the one exception: it reads `NEXT_PUBLIC_*` display knobs). No direct imports from `data-access/` server modules — go through hooks.
- A panel reads server data via its hook (`useIssues`, …) and UI state via Zustand (`useDashboardWindow`, `useSelectedPanel`, …).
- Mark `"use client"` only when needed (state, effects, event handlers). Prefer leaving as Server Component when the panel just renders props.

### `hooks/` — TanStack Query

- One hook per data view. Always `"use client"`.
- Uses `useQuery` (or `useMutation`) with a key from `queryKeys.ts` and a fetcher from `data-access/fetch*Client.ts`.
- **No `useEffect + fetch`. No `setInterval`. No `router.refresh()` for polling.** Use `refetchInterval` on the query.
- Polling interval flows in as a prop / from Zustand config, never hard-coded.

Template:
```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchIssuesClient } from "../data-access/fetchIssuesClient";
import { issuesKeys } from "../queryKeys";

export function useIssues(documentId: string, limit: number, intervalMs: number) {
  return useQuery({
    queryKey: issuesKeys.recent(documentId, limit),
    queryFn: () => fetchIssuesClient(documentId, limit),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
```

### `data-access/`

Two kinds of files in this folder — keep them separate:

1. **Server orchestrators** (e.g. `IssuesDataAccess.ts`):
   - First line `import "server-only";`.
   - Compose monitor calls via `get<Family>Monitor()` — passing the **panel** id they received.
   - Map the monitor-domain type → feature view model (the `<Feature>Row` / `<Feature>View` shape consumed by the UI).
   - Wrap data fetches in React `cache()` for per-request deduplication.
   - Exported as a class instance singleton (`export const issuesDataAccess = new IssuesDataAccess()`).

2. **Client fetchers** (e.g. `fetchIssuesClient.ts`):
   - Plain `fetch()` to `/api/<feature>/...`.
   - Unwrap `{ data }` / throw on `{ error }`.
   - Never import from server orchestrators.

### `domain/` — view models

Feature-specific shapes the UI renders directly (e.g. `IssueRow` with `lastSeenLabel` pre-formatted). Different from the monitor domain (`Issue`) which is the raw provider-agnostic type. Mapping happens in the server orchestrator.

### `queryKeys.ts`

Export a single object whose methods return tuples typed `as const`:

```ts
export const issuesKeys = {
  recent: (documentId: string, limit: number) =>
    ["issues", "recent", documentId, limit] as const,
  detail: (issueId: string, environment: string | null = null) =>
    ["issues", "detail", issueId, environment] as const,
};
```

Use these keys both in `useQuery` and in `invalidateQueries`. Never inline a query key in a component.

**Put the id first among the variable segments.** A project or panel switch then invalidates nothing by hand — the new key is simply a cache miss. Every key follows this, `configKeys.pannels(documentId)` included.

**Build the whole key inside the factory.** `issuesKeys.isConfig(documentId, environment, panelSlug)` takes the panel slug rather than letting `useProjectStrategy` append it, so `page.tsx` can seed the same key. A hook that spreads a factory result and adds a segment makes the key unreproducible server-side.

## The dashboard feature — composition root

`features/dashboard/` owns the kiosk chrome and decides what the grid contains:

1. `useActiveProject(initialDocumentId, fallbackRefreshIntervalMs)` resolves the **project** (persisted selection, reconciled against the catalog) and its `refreshIntervalMs`.
2. `useActivePanel(documentId)` resolves the **panel** the same way — `persist.rehydrate()` after mount, then reconciliation against `usePanels(documentId)` — and returns `{ panelId, panelSlug, panels }`.
3. `useProjectStrategy(projectDocumentId, panelSlug, environment, intervalMs)` returns the selected panel's `Strategy[]`.
4. `DashboardContent` maps those strategy names to widgets, using the constants from `@/lib/shared/strategiesEnum`:

| Strategy | Widgets mounted |
|---|---|
| `error-monitor` | `IssuesPanel`, `ErrorRatePanel`, `IssueKpi` |
| `log-monitor` | `ReservationsPanel`, `ReservationsKpiCard` |
| `tracker-monitor` | `VisitorsPanel`, `VisitorsKpi` |

The left column collapses (`hidden`, `grid-cols-1`) when the panel maps neither `error-monitor` nor `tracker-monitor`. Add a strategy to the grid by extending that mapping — never by having a widget fetch its own strategy list.

**Selection is resolved in hooks, never in the selector components.** `ProjectSelector`, `PannelSelector`, `WindowSelector` and `EnvironmentSelector` are all mounted behind `NEXT_PUBLIC_DASHBOARD_INTERACTIVITY`, so anything a read-only kiosk needs has to live in `useActiveProject` / `useActivePanel`, which `DashboardContent` always calls. Putting the panel auto-selection back into `PannelSelector` would leave a non-interactive kiosk with no panel and therefore no widget.

Panel icons are Strapi strings in kebab-case (`panels-right-bottom`) resolved against `lucide-react`'s `icons` map by `PannelSelector.getLucideIcon()`, which falls back to `Circle`. An unknown icon name is therefore a silent fallback, not an error.

## Zustand vs TanStack Query

- **TanStack Query** owns *server state*. Anything from `/api/*`.
- **Zustand** owns *UI state*: open/close sheets, selected project, selected panel, selected window, selected environment.

If you find yourself stashing server data in a Zustand store, stop — that's a sign the query key or fetcher shape is wrong. `useSelectedPanel` holds the panel's `id`, `slug` and `icon` because they *are* the selection; the panel's tool configuration stays server-side.

## Adding a feature

1. Create `src/app/features/<name>/` with the folders above.
2. Add a route under [src/app/api/<name>/](../api/CLAUDE.md).
3. If the data comes from a new external system, add a monitor adapter ([src/lib/CLAUDE.md](../../lib/CLAUDE.md)) — don't reach out to vendor APIs from the data-access layer directly.
4. Decide which strategy gates the widget, and mount it from `DashboardContent`'s strategy mapping.
5. Add tests mirroring the structure under `tests/app/features/<name>/` ([tests/CLAUDE.md](../../../../../tests/CLAUDE.md)).

## The server prefetch — keep it in step with this folder

[page.tsx](../page.tsx) resolves the **default panel** server-side (the first entry of `getProjectPanels()`, which Strapi sorts by `order` — the same one `PannelSelector` selects when nothing is persisted) and prefetches with *that* id. Four rules keep it working; break any of them and the hydrated cache is silently ignored:

1. **Key the widget prefetches on `initialPanel.id`**, never on the project id.
2. **Gate each prefetch on the same strategy that mounts the widget.** The `if` blocks in `page.tsx` mirror `DashboardContent`'s mapping — prefetching an unmapped widget resolves no factory and throws.
3. **Use `initialWindowMinutes`** for any window segment: that is what `useDashboardWindow` holds after `hydrateFromStrapi`, so the env fallback would build a different key.
4. **Seed `configKeys.pannels(projectId)` and the strategy key** so the client can decide what to mount without a round-trip.

Adding a widget means touching both sides: the strategy mapping in `DashboardContent` *and* the matching prefetch block. A widget mounted but not prefetched just fetches on mount; a widget prefetched under the wrong key wastes a server-side provider call on every page load.

Also mind that the prefetch must call the **same data-access method as the route** — `getRecent` for `/api/issues`, not `getRecentUnresolved`. Two different datasets under one query key means the first paint disagrees with the first refetch.
