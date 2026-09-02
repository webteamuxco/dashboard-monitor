# dashboard-monitor — Claude guide

**pnpm + Turborepo monorepo.** Two apps: a Next.js 16 kiosk dashboard and a Docusaurus documentation site. The dashboard aggregates monitoring data (errors, logs, visitor analytics) behind a Strategy/Factory layer so providers (GlitchTip, PostHog, …) are swappable per **dashboard panel**, wired from Strapi admin.

Read this file first. Then load the nearest sub-`CLAUDE.md` for the area you're editing.

## Monorepo layout

```
dashboard-monitor/
├── apps/
│   ├── dashboard/            # Next.js 16 kiosk app (package "dashboard-monitor")
│   │   ├── src/app/          # App Router: pages, api/, features/
│   │   ├── src/lib/          # Monitor layer, Strapi config layer, HTTP clients
│   │   ├── src/components/   # shadcn-derived UI primitives
│   │   └── .env.example      # env template (copy to apps/dashboard/.env.local)
│   └── docs-site/            # Docusaurus 3 site (package "docs-site", port 3002)
│       ├── docs/             # The project documentation (source of truth)
│       └── docusaurus.config.ts
├── tests/                    # Vitest suite for apps/dashboard — lives at the ROOT
├── vitest.config.ts          # Root Vitest config: @ → apps/dashboard/src
├── turbo.json                # Task graph
└── pnpm-workspace.yaml       # packages: apps/*
```

Two things routinely surprise people:

- **The Vitest suite is at the repo root**, not inside `apps/dashboard`. The root [vitest.config.ts](vitest.config.ts) maps `@/` to `apps/dashboard/src` and `include: ["tests/**/*.test.ts"]`. The `test` task is declared by the dashboard package, so `turbo run test` executes it from `apps/dashboard` against the root config.
- **`.env.local` belongs to `apps/dashboard/`**, not the root. `cp apps/dashboard/.env.example apps/dashboard/.env.local`.

## Stack

- **Turborepo 2** + **pnpm 10** workspace, **husky** for hooks, **git-cliff** for the changelog
- **Next.js 16** App Router, React 19, all dashboard pages `force-dynamic`
- **TanStack Query 5** — server state, polling, cache
- **Zustand 5** — UI-only state (no server data)
- **Recharts** — time-series charts
- **Tailwind 4 + shadcn / Base UI** — styling, **lucide-react** for icons
- **Vitest** — unit tests (node env)
- **Docusaurus 3** (+ mermaid theme) — the docs site

## Scripts

Run from the repo root — every script fans out through Turborepo:

```bash
pnpm dev            # dashboard on :3000 + docs site on :3002
pnpm build          # production build of both apps
pnpm typecheck      # tsc --noEmit (dashboard) + tsc (docs-site)
pnpm lint           # ESLint (dashboard only)
pnpm test           # Vitest one-shot
pnpm test:watch
pnpm test:coverage
```

Target a single app with `pnpm --filter dashboard-monitor <script>` or `pnpm --filter docs-site <script>`.

Before pushing, run `pnpm typecheck && pnpm lint && pnpm test`. Husky enforces this.

## Workflow rules

- **Discuss architecture before coding.** For any non-trivial change, propose the approach (interfaces, file moves, contracts) and wait for sign-off before scaffolding.
- **Edit existing files.** Don't create new docs / READMEs / utility files unless asked. Project docs live in `apps/docs-site/docs/` and are referenced from `README.md`.
- **Docs are written in English**, even when the conversation is in French. That covers `apps/docs-site/docs/**`, every `CLAUDE.md`, `README.md`, `.env.example` comments and the `.drawio` labels.
- **No half-finished work.** No TODOs left in code, no commented-out code, no `_unused` shims.
- **No comments unless the *why* is non-obvious.** Names carry intent. Reserve comments for hidden constraints (e.g. `force-dynamic` rationale, `skipHydration` rationale, env-var coupling).
- **A GraphQL query and its DTO must mirror each other field for field.** `StrapiRepository.execute<T>()` is an unchecked cast: a field dropped from a query silently becomes `undefined` downstream. That is exactly how the window presets broke once — `timeInterval` was removed from `GetProjectById` while `mapProject` still read `dto.timeInterval`.

## Sub-areas — load the relevant `CLAUDE.md`

| When editing… | Read |
|---|---|
| `apps/dashboard/src/lib/{errorMonitor,logMonitor,trackerMonitor,config}/**` | [apps/dashboard/src/lib/CLAUDE.md](apps/dashboard/src/lib/CLAUDE.md) |
| `apps/dashboard/src/app/api/**` | [apps/dashboard/src/app/api/CLAUDE.md](apps/dashboard/src/app/api/CLAUDE.md) |
| `apps/dashboard/src/app/features/**` | [apps/dashboard/src/app/features/CLAUDE.md](apps/dashboard/src/app/features/CLAUDE.md) |
| `tests/**` | [tests/CLAUDE.md](tests/CLAUDE.md) |
| `apps/docs-site/**` | [apps/docs-site/docs/](apps/docs-site/docs/) — edit the docs themselves; keep the mermaid diagrams in sync |

## The panel system — read this before touching any data path

A Strapi **project** is no longer the unit that carries tool wiring. It owns an ordered list of **dashboard panels**, and *each panel* declares its own mapped tools and tool configurations:

```
Project (documentId, slug, title)
├── default_config → DefaultRefreshIntervalMS      # polling cadence, project-wide
├── timeInterval[] → window presets                # project-wide
└── dashboard_panels[]                             # ordered by `order`
    ├── documentId · name · slug · display_name · icon · order
    ├── mapped_tools[] → strategies[]              # error-monitor / log-monitor / tracker-monitor
    └── tool_configuration[]                       # glitchtip{url,organization,projectId} | posthog{url,projectId}
```

### Two identifiers, one parameter name

| Value | Where it comes from | What it is used for |
|---|---|---|
| **project `documentId`** | `ProjectSummary.documentId` | project catalog, `defaultConfig`, `timeInterval`, listing panels, listing strategies |
| **panel `documentId`** (`DashboardPanel.id`) | the selected panel | **every data route and the whole monitor layer** |
| **panel `slug`** | the selected panel | GraphQL filter when listing a panel's strategies |

The monitor layer's `documentId` parameter now receives the **panel** id: `getErrorMonitorFactory(panelId)` → `support(panelId, "error-monitor")` → `isPanelHasStrategy(panelId, …)` → `getPanelById(panelId)`. The parameter kept its old name everywhere, so read the call site to know which id you hold. Passing a project id where a panel id is expected fails with `Strapi panel "<id>" not found.`

### What renders which panel

`DashboardContent` asks `useProjectStrategy(projectDocumentId, panelSlug, …)` for the selected panel's strategy names, then mounts only the matching widgets:

| Strategy name | Widgets |
|---|---|
| `error-monitor` | `IssuesPanel`, `ErrorRatePanel`, `IssueKpi` |
| `log-monitor` | `ReservationsPanel`, `ReservationsKpiCard` |
| `tracker-monitor` | `VisitorsPanel`, `VisitorsKpi` |

A panel mapping no strategy renders an empty grid — no error. The loud failure happens one layer down, when a widget's data route resolves a factory that no tool supports.

### Naming trap: `panel` vs `pannel`

The codebase carries both spellings and they are load-bearing — don't "fix" one in isolation:

- Files: `PannelSelector.tsx`, `usePannels.ts` (exports `usePanels`), `fetchProjectPannels.ts` (exports `fetchProjectPanels`)
- Store field: `useSelectedPanel().pannelId` (alongside `panelSlug`, `panelIcon`)
- Query key: `configKeys.pannels(documentId)`
- `localStorage` key: `dashboard-selected-pannel`
- Everything server-side (`DashboardPanel`, `getPanelById`, `dashboard_panels`, `/panels`) uses the correct `panel`.

Renaming these is a coordinated change (the `localStorage` key breaks persisted selections) — propose it, don't slip it into an unrelated commit.

## Cross-cutting conventions

### Server / client boundary

- Anything under `src/lib/{errorMonitor,logMonitor,trackerMonitor}/`, `src/lib/config/` and `src/app/features/*/data-access/` is **server-only** — first line must be `import "server-only";`.
- API secrets (`STRAPI_TOKEN`, `GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY`) must never appear in code reachable from a client component. They live in env vars consumed inside the abstract vendor factories.
- `NEXT_PUBLIC_*` env vars are intentionally non-sensitive (UI knobs only).
- The only identifiers that cross to the client are Strapi `documentId`s — the project's and the panel's — plus the panel's `slug`, `icon` and `display_name`. Provider project ids, instance URLs and organization slugs are resolved server-side from the panel id.

### Client data fetching

- Use **TanStack Query** (`useQuery` / `useMutation`) for anything that comes from `/api/*`. No `useEffect + fetch + setInterval`. No `router.refresh()` for polling.
- Query keys live in `src/app/features/<name>/queryKeys.ts`, exported as `<name>Keys`. Shape: `[feature, sub-resource, id, ...params]` — the id first among the variables, so a panel or project switch is a plain cache miss.
- Polling interval comes from the project's Strapi `defaultConfig.refreshIntervalMs` (fallback 30 000 ms), threaded down as a prop — never hard-coded in a hook.
- Anything resolved on both sides of the hydration boundary (default environment, initial window) lives in one shared isomorphic helper. Diverging silently defeats the server prefetch.

### UI state

- **Zustand** for ephemeral UI state only: selected project, selected panel, selected window, selected environment, open/close sheets. Never store data fetched from the server — the panel *choice* is UI state, the panel *config* is server state.

### Imports

- Always use the `@/` alias for cross-folder imports (`@/lib/...`, `@/app/...`). It resolves to `apps/dashboard/src`. Relative paths only within a single feature/module.

### TypeScript

- `strict: true`. No `any`, no `as unknown as X` shortcuts. Prefer typed DTOs in `dto/` and explicit mappers to domain types.
- Domain types live in `src/lib/<family>/domain/` (provider-agnostic), `src/lib/config/domain/` (Strapi: `Project`, `DashboardPanel`, `Strategy`) and `src/app/features/<name>/domain/` (UI-shaped view models like `IssueRow`).

### Error handling

- HTTP clients (`GlitchTipClient`, `PostHogClient`) throw on non-2xx. Strategies let them bubble. BFF routes catch and return `{ error: message }` with status 502.
- Don't silently swallow errors. Don't add fallbacks that mask provider outages — the dashboard should visibly degrade.

## Configuration — Strapi first, env for secrets

**Which adapter loads is decided per panel in Strapi admin, not by an env var.** A panel declares its mapped tools — a strategy name (`error-monitor`, `log-monitor`, `tracker-monitor`) paired with a tool slug (`glitchtip`, `posthog`) — plus each tool's connection details (url, organization, provider project id). Its parent project carries the refresh cadence and the window presets.

The environment only carries secrets:

- `STRAPI_BASE_URL` / `STRAPI_TOKEN` — the admin itself (base URL is the instance root, `/graphql` is appended)
- `GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY` — validated inside the matching abstract vendor factory when it builds the client

Rule of thumb: if a value differs per project or per panel, it belongs in Strapi. See [apps/dashboard/.env.example](apps/dashboard/.env.example) and [docs/configuration.md](apps/docs-site/docs/configuration.md).

## Project documentation

Long-form docs live in [`apps/docs-site/docs/`](apps/docs-site/docs/) and are served by Docusaurus on `:3002`:

- [intro.md](apps/docs-site/docs/intro.md) — landing page, monorepo overview
- [getting-started.md](apps/docs-site/docs/getting-started.md) — install, env, Strapi setup, troubleshooting
- [architecture.md](apps/docs-site/docs/architecture.md) — layered overview, context, design rationale
- [panels.md](apps/docs-site/docs/panels.md) — the panel system end to end
- [monitors.md](apps/docs-site/docs/monitors.md) — the Strategy/Factory pattern and how to add an adapter
- [features.md](apps/docs-site/docs/features.md) — feature folders catalog
- [data-flow.md](apps/docs-site/docs/data-flow.md) — end-to-end sequence diagrams
- [state-management.md](apps/docs-site/docs/state-management.md) — TanStack Query vs Zustand, query keys
- [configuration.md](apps/docs-site/docs/configuration.md) — the Strapi / env split, every variable
- [diagram/architecture.drawio](apps/docs-site/docs/diagram/architecture.drawio) — draw.io overview + UML detail

When you change behaviour, update the doc page that describes it in the same commit. The mermaid diagrams are part of the docs — a stale diagram is worse than no diagram.
