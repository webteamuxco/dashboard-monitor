# dashboard-monitor

A Next.js / TypeScript kiosk dashboard that aggregates monitoring data (errors, logs, visitor analytics) from pluggable providers behind a Strategy/Factory layer.

Currently ships with two adapters:

- **GlitchTip** — error tracking and log aggregation
- **PostHog** — live visitor analytics

The architecture is provider-agnostic: each monitor family (`errorMonitor`, `logMonitor`, `trackerMonitor`) is an interface backed by a Factory + Resolver. Adding a new backend (Sentry, Mixpanel, Datadog…) is a matter of dropping a new adapter under `src/lib/<family>/adapters/`.

## Stack

- **Next.js 16** (App Router, React 19, force-dynamic pages)
- **TanStack Query 5** — server state, polling, cache
- **Zustand 5** — UI state (dashboard window, config panel)
- **Recharts** — time-series visualizations
- **Tailwind 4 + shadcn** — styling
- **Vitest** — unit tests

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# edit .env: at minimum set GLITCHTIP_* and POSTHOG_* secrets

# 3. Run
npm run dev
```

Open <http://localhost:3000>.

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` / `npm start` — production build & serve
- `npm run typecheck` — TypeScript type checking (no emit)
- `npm run lint` — ESLint
- `npm test` — Vitest (one-shot)
- `npm run test:watch` — Vitest watch mode
- `npm run test:coverage` — Vitest with coverage

## Documentation

- [Getting Started](docs/getting-started.md) — install, env, dev workflow, troubleshooting
- [Architecture](docs/architecture.md) — layered overview, context diagram, design rationale
- [Monitors (Strategy/Factory)](docs/monitors.md) — core pattern + guide to add a new adapter
- [Features](docs/features.md) — feature folders catalog (issues, errorRate, reservations, visitors…)
- [Data Flow](docs/data-flow.md) — end-to-end sequence diagrams (UI → external API → render)
- [State Management](docs/state-management.md) — TanStack Query vs Zustand, query keys, conventions
- [Configuration](docs/configuration.md) — all env vars, defaults, where they are consumed

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
│   ├── glitchtip/      # Low-level GlitchTip HTTP client
│   └── posthog/        # Low-level PostHog HTTP client
├── components/         # Reusable UI primitives (shadcn-derived)
└── hooks/              # Shared React hooks
docs/                   # Project documentation (you are here)
```
