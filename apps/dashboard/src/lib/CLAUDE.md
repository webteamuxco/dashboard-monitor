# src/lib — Monitor layer & HTTP clients

This folder hosts the **provider-agnostic abstraction** for external monitoring data. The UI must never know which vendor backs a given monitor.

## Layout

```
src/lib/
├── errorMonitor/         # Strategy/Factory for error tracking
├── logMonitor/           # Strategy/Factory for log aggregation
├── trackerMonitor/       # Strategy/Factory for visitor analytics
├── config/domain/        # Strapi admin: projects, mapped tools, tool connections
├── tool/glitchtip/       # Low-level GlitchTip HTTP client (transport only)
├── tool/posthog/         # Low-level PostHog HTTP client (transport only)
├── shared/domain/        # Cross-monitor domain types (e.g. Period)
└── shared/factory/       # FactoryInterface + per-vendor abstract factories
```

Each `<family>Monitor/` folder follows the **same** structure:

```
<family>Monitor/
├── Get<Family>Monitor.ts           # Composition root: resolves the Factory for a documentId
├── <Family>MonitorTypeEnums.ts     # Tool slug constants (e.g. GLITCHTIP = "glitchtip")
├── domain/                         # Provider-agnostic types (Issue, IssueEvent, …)
├── strategy/
│   └── <Family>MonitorStrategyInterface.ts
├── factory/
│   ├── <Family>MonitorFactoryInterface.ts   # alias of FactoryInterface<TStrategy>
│   └── <Family>MonitorResolver.ts           # picks factory by support(documentId, strategy)
└── adapters/
    └── <provider>/
        ├── <Provider>Factory.ts             # extends the shared abstract vendor factory
        ├── <Provider>Strategy.ts            # implements StrategyInterface
        ├── dto/                             # raw provider response types
        └── mappers/                         # DTO → domain
```

## Resolution flow — Strapi drives the adapter

A family exposes three calls, in this order:

```ts
const factory = await getErrorMonitorFactory(documentId)   // asks Strapi which tool is mapped
const connection = await factory.createConnection(documentId) // url / org / projectId from Strapi
const strategy = factory.createStrategy(connection)           // reads the API secret from env
```

`FactoryInterface<TStrategy>` ([shared/factory/FactoryInterface.ts](shared/factory/FactoryInterface.ts)) is the contract: `support(documentId, strategyResolver)`, `createConnection(documentId)`, `createStrategy(connection)`.

`support()` is answered by the Strapi mapped tools, matching a **strategy name** (`error-monitor`, `log-monitor`, `tracker-monitor` — the `STRATEGY_RESOLVER` constant of each resolver) against a **tool slug** (`glitchtip`, `posthog` — the `TOOL_RESOLVER` constant of each abstract vendor factory). A project with no matching mapped tool makes the resolver throw — that is the intended visible failure, not a fallback.

Vendor plumbing lives once per vendor in `shared/factory/Abstract<Vendor>Factory.ts`: it owns `support()`, `createConnection()`, the connection type guard, and the client construction (including the env secret check). A family adapter only implements `createStrategy()`.

## `config/domain/` — the Strapi layer

The folder that answers `support()` and `createConnection()`. Same DTO / domain split as an adapter:

```
config/domain/
├── gql/                  # One file per GraphQL operation
├── dto/                  # Raw Strapi response shapes (*Dto, Strapi field names)
├── mappers/              # DTO → domain
├── tool/                 # <Vendor>ConfigurationStrategy + ToolConnection
├── Project.ts, …         # Provider-agnostic types the factories consume
└── StrapiRepository.ts   # Runs a query, returns domain types
```

- **Strapi field names stay in `dto/`.** `mapped_tool`, `tool_configuration`, `DefaultRefreshIntervalMS` must not appear in the types at the root of `config/domain/` — `mapProject` / `mapProjectSummary` rename them. The dependency runs `dto → mappers → domain`; a `dto/` file never imports from the root.
- **One operation per file in `gql/`**, exporting `get<Name>Query()` returning `GraphQlQuery`. The document is a **static literal** tagged with `gql` (`shared/domain/GraphqlQuery.ts`) — an identity tag whose only job is to let the language server configured in [graphql.config.yml](../../graphql.config.yml) validate it against the live Strapi schema. Never assemble a selection set by concatenation: it blinds the editor and any future codegen. Name the operation after the file.
- **`StrapiRepository.execute<T>()` is an unchecked assertion.** The envelope passed to it (`{ project: ProjectDto | null }`) must mirror the query's selection set field for field — nothing validates it at runtime.

## Invariants — do not break

1. **`import "server-only";` is the first line** of every file in this folder. Compile fails if a client component pulls one in.
2. **The Strategy interface is the contract.** UI/data-access code talks only to `<Family>MonitorStrategyInterface`. No leaking DTOs, no leaking provider-specific fields.
3. **Domain types in `domain/` are pure.** No imports from `adapters/`, no provider field names. Renaming `glitchtip` → `sentry` must not touch `domain/`.
4. **DTOs stay inside the adapter.** Every adapter has its own `dto/` and `mappers/`. Never import `adapters/X/dto/...` from another adapter or from `domain/`.
5. **Factories own env validation.** The only provider env vars are the API secrets (`GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY`), read in the abstract vendor factory's client builder. If one is missing → throw immediately with a message naming it. Never read provider env vars from a strategy or HTTP client. Everything else (url, organization, projectId) comes from Strapi via `createConnection()`.
6. **HTTP clients are transport only.** `GlitchTipClient` / `PostHogClient` know about auth headers, JSON parsing, URL composition — nothing about monitor families or domain types.
7. **The resolver picks via `support(documentId, strategy)`.** Adding a provider = new adapter folder + register its Factory in `Get<Family>Monitor.ts`'s `factories` array + add the tool slug to the enum file + map the tool to the project in Strapi admin. The resolver code does not change.

## Adding a new adapter (e.g. Sentry for errorMonitor)

1. Add a constant in `errorMonitor/ErrorMonitorTypeEnums.ts`: `export const SENTRY = "sentry"` and append to `toolList`.
2. If Sentry is a new vendor, add `shared/factory/AbstractSentryFactory.ts` with its `TOOL_RESOLVER = "sentry"`, its `support()` / `createConnection()` backed by a `SentryConfigurationStrategy`, and its client builder reading `SENTRY_TOKEN`.
3. Create `errorMonitor/adapters/sentry/`:
   - `SentryErrorMonitorFactory.ts` extending `AbstractSentryFactory` and implementing `ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>` — only `createStrategy(connection)`.
   - `SentryStrategy.ts` implementing `ErrorMonitorStrategyInterface`.
   - `dto/` for Sentry response shapes.
   - `mappers/` translating DTO → existing `domain/` types (`Issue`, `IssueEvent`, …). **Do not modify the domain types** to fit Sentry — add the mapping logic instead.
4. Register the factory in `errorMonitor/GetErrorMonitor.ts`:

   ```ts
   const factories: ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>[] = [
     new GlitchTipFactory(),
     new SentryErrorMonitorFactory(),
   ];
   ```

5. Document the new secret in `.env.example`, and map the tool to the project in Strapi admin.
6. Add tests under `tests/lib/errorMonitor/adapters/sentry/` (see [tests/CLAUDE.md](../../tests/CLAUDE.md)).

If a Sentry field has no equivalent in the existing domain type, **discuss before extending the domain**: extending it impacts every adapter.

## Adding a new monitor family (e.g. uptimeMonitor)

Mirror the `errorMonitor/` skeleton exactly: `domain/`, `strategy/`, `factory/`, `adapters/`, `Get<Family>Monitor.ts`, `<Family>MonitorTypeEnums.ts`. Pick the resolver's `STRATEGY_RESOLVER` (e.g. `uptime-monitor`) and declare that strategy in Strapi admin — no env var is involved in family resolution.

## What does NOT belong here

- React components, hooks, JSX, `"use client"`.
- Anything that talks to TanStack Query or Zustand.
- HTTP routes — those live in [src/app/api/](../app/api/CLAUDE.md).
- UI-shaped view models (`IssueRow`, `IssueDetailView`) — those live in `src/app/features/<name>/domain/`.
