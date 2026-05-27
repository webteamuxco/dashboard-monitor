# src/lib — Monitor layer & HTTP clients

This folder hosts the **provider-agnostic abstraction** for external monitoring data. The UI must never know which vendor backs a given monitor.

## Layout

```
src/lib/
├── errorMonitor/         # Strategy/Factory for error tracking
├── logMonitor/           # Strategy/Factory for log aggregation
├── trackerMonitor/       # Strategy/Factory for visitor analytics
├── glitchtip/            # Low-level GlitchTip HTTP client (transport only)
├── posthog/              # Low-level PostHog HTTP client (transport only)
└── shared/domain/        # Cross-monitor domain types (e.g. Period)
```

Each `<family>Monitor/` folder follows the **same** structure:

```
<family>Monitor/
├── Get<Family>Monitor.ts           # Composition root: resolves driver from env, returns Strategy
├── <Family>MonitorTypeEnums.ts     # Driver name constants (e.g. GLITCHTIP = "glitchtip")
├── domain/                         # Provider-agnostic types (Issue, IssueEvent, …)
├── strategy/
│   └── <Family>MonitorStrategyInterface.ts
├── factory/
│   ├── <Family>MonitorFactoryInterface.ts   # { support(type), create() }
│   └── <Family>MonitorResolver.ts           # picks factory by support()
└── adapters/
    └── <provider>/
        ├── <Provider>Factory.ts             # reads env, builds client + strategy
        ├── <Provider>Strategy.ts            # implements StrategyInterface
        ├── dto/                             # raw provider response types
        └── mappers/                         # DTO → domain
```

## Invariants — do not break

1. **`import "server-only";` is the first line** of every file in this folder. Compile fails if a client component pulls one in.
2. **The Strategy interface is the contract.** UI/data-access code talks only to `<Family>MonitorStrategyInterface`. No leaking DTOs, no leaking provider-specific fields.
3. **Domain types in `domain/` are pure.** No imports from `adapters/`, no provider field names. Renaming `glitchtip` → `sentry` must not touch `domain/`.
4. **DTOs stay inside the adapter.** Every adapter has its own `dto/` and `mappers/`. Never import `adapters/X/dto/...` from another adapter or from `domain/`.
5. **Factories own env validation.** All `GLITCHTIP_URL`/`POSTHOG_HOST` reads happen in `<Provider>Factory.create()`. If a var is missing → throw immediately with a message naming the missing var(s). Never read provider env vars from a strategy or HTTP client.
6. **HTTP clients are transport only.** `GlitchTipClient` / `PostHogClient` know about auth headers, JSON parsing, URL composition — nothing about monitor families or domain types.
7. **The resolver picks via `support(type)`.** Adding a provider = new adapter folder + register its Factory in `Get<Family>Monitor.ts`'s `factories` array + add the driver name to the enum file. The resolver code does not change.

## Adding a new adapter (e.g. Sentry for errorMonitor)

1. Add a constant in `errorMonitor/ErrorMonitorTypeEnums.ts`: `export const SENTRY = "sentry"` and append to `toolList`.
2. Create `errorMonitor/adapters/sentry/`:
   - `SentryFactory.ts` implementing `ErrorMonitorFactoryInterface` — `support(t) => t === SENTRY`, `create()` reads `SENTRY_*` env, returns `new SentryStrategy(...)`.
   - `SentryStrategy.ts` implementing `ErrorMonitorStrategyInterface`.
   - `dto/` for Sentry response shapes.
   - `mappers/` translating DTO → existing `domain/` types (`Issue`, `IssueEvent`, …). **Do not modify the domain types** to fit Sentry — add the mapping logic instead.
3. Register the factory in `errorMonitor/GetErrorMonitor.ts`:
   ```ts
   const factories: ErrorMonitorFactoryInterface[] = [
     new GlitchTipFactory(),
     new SentryFactory(),
   ];
   ```
4. Document the new env vars in `.env.example`.
5. Add tests under `tests/lib/errorMonitor/adapters/sentry/` (see [tests/CLAUDE.md](../../tests/CLAUDE.md)).

If a Sentry field has no equivalent in the existing domain type, **discuss before extending the domain**: extending it impacts every adapter.

## Adding a new monitor family (e.g. uptimeMonitor)

Mirror the `errorMonitor/` skeleton exactly: `domain/`, `strategy/`, `factory/`, `adapters/`, `Get<Family>Monitor.ts`, `<Family>MonitorTypeEnums.ts`. Add a driver env var (`NEXT_PUBLIC_UPTIME_MONITOR_DRIVER`) and document it in `.env.example`.

## What does NOT belong here

- React components, hooks, JSX, `"use client"`.
- Anything that talks to TanStack Query or Zustand.
- HTTP routes — those live in [src/app/api/](../app/api/CLAUDE.md).
- UI-shaped view models (`IssueRow`, `IssueDetailView`) — those live in `src/app/features/<name>/domain/`.
