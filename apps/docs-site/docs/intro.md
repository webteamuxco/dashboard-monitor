---
sidebar_position: 1
title: Introduction
slug: /
---

# dashboard-monitor

A Next.js / TypeScript kiosk dashboard that aggregates monitoring data (errors, logs, visitor analytics) from pluggable providers behind a Strategy/Factory layer.

Currently ships with two adapters:

- **GlitchTip** — error tracking and log aggregation
- **PostHog** — live visitor analytics

The architecture is provider-agnostic: each monitor family (`errorMonitor`, `logMonitor`, `trackerMonitor`) is an interface backed by a Factory + Resolver. Adding a new backend (Sentry, Mixpanel, Datadog…) is a matter of dropping a new adapter under `apps/dashboard/src/lib/<family>/adapters/`.

**Which adapter runs is decided per dashboard panel in Strapi admin**, not by an env var. A Strapi project owns an ordered list of panels, and each panel declares its mapped tools (`error-monitor` × `glitchtip`, `tracker-monitor` × `posthog`, …) and each tool's connection details. The environment only carries the API secrets. See [Panels](panels.md).

## Monorepo

The repository is a **pnpm + Turborepo** workspace with two apps:

| App | Package | What it is |
|---|---|---|
| `apps/dashboard` | `dashboard-monitor` | the Next.js 16 kiosk dashboard (port 3000) |
| `apps/docs-site` | `docs-site` | this Docusaurus site (port 3002) |

The Vitest suite lives at the **repo root** (`tests/`), not inside `apps/dashboard`, and the root `vitest.config.ts` maps `@/` to `apps/dashboard/src`.

## Stack

- **Turborepo 2** + **pnpm 10** workspace
- **Next.js 16** (App Router, React 19, force-dynamic pages)
- **TanStack Query 5** — server state, polling, cache
- **Zustand 5** — UI state (selected project, panel, window, environment)
- **Recharts** — time-series visualizations
- **Tailwind 4 + shadcn / Base UI** — styling, **lucide-react** icons
- **Strapi** (external) — project catalog, panels and provider wiring
- **Vitest** — unit tests
- **Docusaurus 3** — the docs you're reading

## Quickstart

```bash
# 1. Install (from the repo root)
pnpm install

# 2. Configure the dashboard app
cp apps/dashboard/.env.example apps/dashboard/.env.local
# edit it: STRAPI_BASE_URL, STRAPI_TOKEN, GLITCHTIP_TOKEN, POSTHOG_PERSONAL_API_KEY

# 3. Declare at least one published project with one dashboard panel in Strapi
#    (mapped tools + tool configurations on the panel — see Getting started)

# 4. Run both apps
pnpm dev
```

Dashboard on [http://localhost:3000](http://localhost:3000), docs on [http://localhost:3002](http://localhost:3002).

## Scripts

All of them run from the repo root and fan out through Turborepo:

- `pnpm dev` — dashboard + docs site
- `pnpm build` / `pnpm start` — production build & serve
- `pnpm typecheck` — TypeScript type checking (no emit)
- `pnpm lint` — ESLint
- `pnpm test` — Vitest (one-shot)
- `pnpm test:watch` — Vitest watch mode
- `pnpm test:coverage` — Vitest with coverage

Scope a script to one app with `pnpm --filter dashboard-monitor <script>` or `pnpm --filter docs-site <script>`.

## Documentation

- [Getting Started](getting-started.md) — install, env, Strapi setup, dev workflow, troubleshooting
- [Architecture](architecture.md) — layered overview, context diagram, design rationale
- [Panels](panels.md) — the panel system: content model, ids, selection, resolution
- [Monitors (Strategy/Factory)](monitors.md) — core pattern + guide to add a new adapter
- [Features](features.md) — feature folders catalog (issues, errorRate, reservations, visitors, config…)
- [Data Flow](data-flow.md) — end-to-end sequence diagrams (UI → external API → render)
- [State Management](state-management.md) — TanStack Query vs Zustand, query keys, conventions
- [Configuration](configuration.md) — the Strapi / env split, all variables, where they are consumed
- [Diagram source](diagram/architecture.drawio) — draw.io overview + UML detail

## Repository structure

```text
dashboard-monitor/
├── apps/
│   ├── dashboard/
│   │   ├── src/app/
│   │   │   ├── api/            # Backend-for-frontend (one route per data view)
│   │   │   ├── features/       # issues · errorRate · reservations · visitors · dashboard · config
│   │   │   └── page.tsx        # Server Component: catalog + prefetch
│   │   ├── src/lib/
│   │   │   ├── errorMonitor/   # Strategy/Factory for error tracking
│   │   │   ├── logMonitor/     # Strategy/Factory for log aggregation
│   │   │   ├── trackerMonitor/ # Strategy/Factory for visitor analytics
│   │   │   ├── config/         # Strapi: projects, panels, mapped tools, tool connections
│   │   │   ├── shared/         # FactoryInterface + abstract vendor factories + shared domain
│   │   │   └── tool/           # Low-level HTTP clients (glitchtip, posthog)
│   │   ├── src/components/     # Reusable UI primitives (shadcn-derived)
│   │   └── .env.example        # env template
│   └── docs-site/docs/         # This documentation
├── tests/                      # Vitest suite, mirrors apps/dashboard/src
├── vitest.config.ts            # @ → apps/dashboard/src
└── turbo.json                  # Task graph
```
