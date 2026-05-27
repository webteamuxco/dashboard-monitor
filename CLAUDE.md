# dashboard-monitor — Claude guide

Next.js 16 / React 19 / TypeScript kiosk dashboard. Aggregates monitoring data (errors, logs, visitor analytics) behind a Strategy/Factory layer so providers (GlitchTip, PostHog, …) are swappable via env vars.

Read this file first. Then load the nearest sub-`CLAUDE.md` for the area you're editing.

## Stack

- **Next.js 16** App Router, React 19, all dashboard pages `force-dynamic`
- **TanStack Query 5** — server state, polling, cache
- **Zustand 5** — UI-only state (no server data)
- **Recharts** — time-series charts
- **Tailwind 4 + shadcn / Base UI** — styling
- **Vitest** — unit tests (node env)
- **pnpm** workspace, **husky** for hooks

## Scripts

```bash
pnpm dev            # Next dev server
pnpm build          # Production build
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
pnpm test           # Vitest one-shot
pnpm test:watch
pnpm test:coverage
```

Before pushing, run `pnpm typecheck && pnpm lint && pnpm test`. Husky enforces this.

## Workflow rules

- **Discuss architecture before coding.** For any non-trivial change, propose the approach (interfaces, file moves, contracts) and wait for sign-off before scaffolding.
- **Edit existing files.** Don't create new docs / READMEs / utility files unless asked. Project docs live in `docs/` and are referenced from `README.md`.
- **No half-finished work.** No TODOs left in code, no commented-out code, no `_unused` shims.
- **No comments unless the *why* is non-obvious.** Names carry intent. Reserve comments for hidden constraints (e.g. `force-dynamic` rationale, env-var coupling).

## Sub-areas — load the relevant `CLAUDE.md`

| When editing… | Read |
|---|---|
| `src/lib/{errorMonitor,logMonitor,trackerMonitor}/**` | [src/lib/CLAUDE.md](src/lib/CLAUDE.md) |
| `src/app/api/**` | [src/app/api/CLAUDE.md](src/app/api/CLAUDE.md) |
| `src/app/features/**` | [src/app/features/CLAUDE.md](src/app/features/CLAUDE.md) |
| `tests/**` | [tests/CLAUDE.md](tests/CLAUDE.md) |

## Cross-cutting conventions

### Server / client boundary

- Anything under `src/lib/{errorMonitor,logMonitor,trackerMonitor}/` and `src/app/features/*/data-access/` is **server-only** — first line must be `import "server-only";`.
- API secrets (`GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY`) must never appear in code reachable from a client component. They live in env vars consumed inside factories.
- `NEXT_PUBLIC_*` env vars are intentionally non-sensitive (driver names, UI knobs).

### Client data fetching

- Use **TanStack Query** (`useQuery` / `useMutation`) for anything that comes from `/api/*`. No `useEffect + fetch + setInterval`. No `router.refresh()` for polling.
- Query keys live in `src/app/features/<name>/queryKeys.ts`, exported as `<name>Keys`. Shape: `[feature, sub-resource, ...params]`.
- Polling interval comes from env (`DASHBOARD_REFRESH_INTERVAL_MS`) or Zustand config — never hard-coded in a hook.

### UI state

- **Zustand** for ephemeral UI state only: open/close sheets, selected window, config-panel state. Never store data fetched from the server.

### Imports

- Always use the `@/` alias for cross-folder imports (`@/lib/...`, `@/app/...`). Relative paths only within a single feature/module.

### TypeScript

- `strict: true`. No `any`, no `as unknown as X` shortcuts. Prefer typed DTOs in `dto/` and explicit mappers to domain types.
- Domain types live in `src/lib/<family>/domain/` (provider-agnostic) and `src/app/features/<name>/domain/` (UI-shaped view models like `IssueRow`).

### Error handling

- HTTP clients (`GlitchTipClient`, `PostHogClient`) throw on non-2xx. Strategies let them bubble. BFF routes catch and return `{ error: message }` with status 502.
- Don't silently swallow errors. Don't add fallbacks that mask provider outages — the dashboard should visibly degrade.

## Environment

See [`.env.example`](.env.example) for the full list. Three driver vars decide which adapter loads:

- `NEXT_PUBLIC_ERROR_MONITOR_DRIVER` (e.g. `glitchtip`)
- `NEXT_PUBLIC_LOG_MONITOR_DRIVER`   (e.g. `glitchtip`)
- `NEXT_PUBLIC_TRACKER_MONITOR_DRIVER` (e.g. `posthog`)

Provider-specific secrets (`GLITCHTIP_*`, `POSTHOG_*`) are validated inside the matching factory's `create()`.

## Project documentation

Long-form docs in [`docs/`](docs/):

- [architecture.md](docs/architecture.md) — layered overview, context, design rationale
- Other docs referenced by [README.md](README.md) may not all exist yet — check before linking.
