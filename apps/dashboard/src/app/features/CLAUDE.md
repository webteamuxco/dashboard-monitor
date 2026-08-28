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

## Layer rules

### `ui/` — components

- React only. No `fetch`. No env reads. No direct imports from `data-access/` server modules — go through hooks.
- A panel reads server data via its hook (`useIssues`, …) and UI state via Zustand (`useDashboardWindow`, …).
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

export function useIssues(projectId: string, limit: number, intervalMs: number) {
  return useQuery({
    queryKey: issuesKeys.recent(projectId, limit),
    queryFn: () => fetchIssuesClient(projectId, limit),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
```

### `data-access/`

Two kinds of files in this folder — keep them separate:

1. **Server orchestrators** (e.g. `IssuesDataAccess.ts`):
   - First line `import "server-only";`.
   - Compose monitor calls via `get<Family>Monitor()`.
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
  recent: (projectId: string, limit: number) =>
    ["issues", "recent", projectId, limit] as const,
  detail: (issueId: string) => ["issues", "detail", issueId] as const,
};
```

Use these keys both in `useQuery` and in `invalidateQueries`. Never inline a query key in a component.

## Zustand vs TanStack Query

- **TanStack Query** owns *server state*. Anything from `/api/*`.
- **Zustand** owns *UI state*: open/close sheets, selected window, config-panel state, dashboard config the user tweaks live.

If you find yourself stashing server data in a Zustand store, stop — that's a sign the query key or fetcher shape is wrong.

## Adding a feature

1. Create `src/app/features/<name>/` with the folders above.
2. Add a route under [src/app/api/<name>/](../api/CLAUDE.md).
3. If the data comes from a new external system, add a monitor adapter ([src/lib/CLAUDE.md](../../lib/CLAUDE.md)) — don't reach out to vendor APIs from the data-access layer directly.
4. Add tests mirroring the structure under `tests/app/features/<name>/` ([tests/CLAUDE.md](../../../tests/CLAUDE.md)).

## What does NOT belong here

- Direct vendor SDK imports (`@sentry/...`, `posthog-node`). Those live in `src/lib/<provider>/`.
- Env-var reads for provider secrets.
- Cross-feature imports of `ui/` components. Promote shared UI to `src/components/`.
