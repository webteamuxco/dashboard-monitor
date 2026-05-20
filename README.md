# dashboard-monitor

A Next.js / TypeScript kiosk dashboard that aggregates monitoring data (errors, logs, visitor analytics) from pluggable providers behind a Strategy/Factory layer.

Currently ships with two adapters:

- **GlitchTip** — error tracking and log aggregation
- **PostHog** — live visitor analytics

The architecture is provider-agnostic: each monitor family (`errorMonitor`, `logMonitor`, `trackerMonitor`) is an interface backed by a Factory + Resolver. Adding a new backend (Sentry, Mixpanel, Datadog…) is a matter of dropping a new adapter under `src/lib/<family>/adapters/`.

**Which adapter runs is decided per project in Strapi admin**, not by an env var. A Strapi project declares its mapped tools (`error-monitor` × `glitchtip`, `tracker-monitor` × `posthog`, …) and each tool's connection details. The environment only carries the API secrets.

## Stack

- **Next.js 16** (App Router, React 19, force-dynamic pages)
- **TanStack Query 5** — server state, polling, cache
- **Zustand 5** — UI state (selected project, window, environment)
- **Recharts** — time-series visualizations
- **Tailwind 4 + shadcn / Base UI** — styling
- **Strapi** (external) — project catalog and provider wiring
- **Vitest** — unit tests

## Quickstart

```bash
# 1. Install
pnpm install

# 2. Configure
cp .env.example .env.local
# edit .env.local: STRAPI_BASE_URL, STRAPI_TOKEN, GLITCHTIP_TOKEN, POSTHOG_PERSONAL_API_KEY

# 3. Declare at least one published project in Strapi
#    (mapped tools + tool configurations — see docs/getting-started.md)

# 4. Run
pnpm dev
```

Open <http://localhost:3000>.

## Scripts

- `pnpm dev` — Next.js dev server
- `pnpm build` / `pnpm start` — production build & serve
- `pnpm typecheck` — TypeScript type checking (no emit)
- `pnpm lint` — ESLint
- `pnpm test` — Vitest (one-shot)
- `pnpm test:watch` — Vitest watch mode
- `pnpm test:coverage` — Vitest with coverage

## Documentation

- [Getting Started](docs/getting-started.md) — install, env, Strapi setup, dev workflow, troubleshooting
- [Architecture](docs/architecture.md) — layered overview, context diagram, design rationale
- [Monitors (Strategy/Factory)](docs/monitors.md) — core pattern + guide to add a new adapter
- [Features](docs/features.md) — feature folders catalog (issues, errorRate, reservations, visitors, config…)
- [Data Flow](docs/data-flow.md) — end-to-end sequence diagrams (UI → external API → render)
- [State Management](docs/state-management.md) — TanStack Query vs Zustand, query keys, conventions
- [Configuration](docs/configuration.md) — the Strapi / env split, all variables, where they are consumed
- [Diagram source](docs/diagram/architecture.drawio) — draw.io overview + UML detail

## Project structure (top level)

```text
src/
├── app/                # Next.js App Router (pages, layouts, API routes, features)
│   ├── api/            # Backend-for-frontend (one route per data view)
│   └── features/       # Feature modules (issues, errorRate, reservations, visitors, dashboard, config)
├── lib/                # Core libraries
│   ├── errorMonitor/   # Strategy/Factory for error tracking
│   ├── logMonitor/     # Strategy/Factory for log aggregation
│   ├── trackerMonitor/ # Strategy/Factory for visitor analytics
│   ├── config/         # Strapi admin: project catalog, mapped tools, tool connections
│   ├── shared/         # FactoryInterface + abstract vendor factories + shared domain
│   └── tool/           # Low-level HTTP clients (glitchtip, posthog)
└── components/         # Reusable UI primitives (shadcn-derived)
tests/                  # Vitest suite, mirrors src/
docs/                   # Project documentation
```
