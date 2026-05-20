# dashboard-monitor — Claude guide

Next.js 16 / React 19 / TypeScript kiosk dashboard. Aggregates monitoring data (errors, logs, visitor analytics) behind a Strategy/Factory layer so providers (GlitchTip, PostHog, …) are swappable per project, wired from Strapi admin.

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

- Anything under `src/lib/{errorMonitor,logMonitor,trackerMonitor}/`, `src/lib/config/` and `src/app/features/*/data-access/` is **server-only** — first line must be `import "server-only";`.
- API secrets (`STRAPI_TOKEN`, `GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY`) must never appear in code reachable from a client component. They live in env vars consumed inside the abstract vendor factories.
- `NEXT_PUBLIC_*` env vars are intentionally non-sensitive (UI knobs only).
- The only project identifier that crosses to the client is the Strapi `documentId`. Provider project ids, instance URLs and organization slugs are resolved server-side from it.

### Client data fetching

- Use **TanStack Query** (`useQuery` / `useMutation`) for anything that comes from `/api/*`. No `useEffect + fetch + setInterval`. No `router.refresh()` for polling.
- Query keys live in `src/app/features/<name>/queryKeys.ts`, exported as `<name>Keys`. Shape: `[feature, sub-resource, documentId, ...params]` — `documentId` first among the variables, so a project switch is a plain cache miss.
- Polling interval comes from the project's Strapi `defaultConfig.refreshIntervalMs` (fallback 30 000 ms), threaded down as a prop — never hard-coded in a hook.
- Anything resolved on both sides of the hydration boundary (default environment, initial window) lives in one shared isomorphic helper. Diverging silently defeats the server prefetch.

### UI state

- **Zustand** for ephemeral UI state only: selected project, selected window, selected environment, open/close sheets. Never store data fetched from the server — the project *choice* is UI state, the project *config* is server state.

### Imports

- Always use the `@/` alias for cross-folder imports (`@/lib/...`, `@/app/...`). Relative paths only within a single feature/module.

### TypeScript

- `strict: true`. No `any`, no `as unknown as X` shortcuts. Prefer typed DTOs in `dto/` and explicit mappers to domain types.
- Domain types live in `src/lib/<family>/domain/` (provider-agnostic) and `src/app/features/<name>/domain/` (UI-shaped view models like `IssueRow`).

### Error handling

- HTTP clients (`GlitchTipClient`, `PostHogClient`) throw on non-2xx. Strategies let them bubble. BFF routes catch and return `{ error: message }` with status 502.
- Don't silently swallow errors. Don't add fallbacks that mask provider outages — the dashboard should visibly degrade.

## Configuration — Strapi first, env for secrets

**Which adapter loads is decided per project in Strapi admin, not by an env var.** A Strapi project declares its mapped tools — a strategy name (`error-monitor`, `log-monitor`, `tracker-monitor`) paired with a tool slug (`glitchtip`, `posthog`) — plus each tool's connection details (url, organization, provider project id), its refresh cadence and its window presets.

The environment only carries secrets:

- `STRAPI_BASE_URL` / `STRAPI_TOKEN` — the admin itself (base URL is the instance root, `/graphql` is appended)
- `GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY` — validated inside the matching abstract vendor factory when it builds the client

Rule of thumb: if a value differs per project, it belongs in Strapi. See [`.env.example`](.env.example) and [docs/configuration.md](docs/configuration.md).

## Project documentation

Long-form docs in [`docs/`](docs/):

- [getting-started.md](docs/getting-started.md) — install, env, Strapi setup, troubleshooting
- [architecture.md](docs/architecture.md) — layered overview, context, design rationale
- [monitors.md](docs/monitors.md) — the Strategy/Factory pattern and how to add an adapter
- [features.md](docs/features.md) — feature folders catalog
- [data-flow.md](docs/data-flow.md) — end-to-end sequence diagrams
- [state-management.md](docs/state-management.md) — TanStack Query vs Zustand, query keys
- [configuration.md](docs/configuration.md) — the Strapi / env split, every variable
- [diagram/architecture.drawio](docs/diagram/architecture.drawio) — draw.io overview + UML detail
