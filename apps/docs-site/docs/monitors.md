# Monitors: Strategy & Factory pattern

The monitor layer is the **central abstraction** of this project. It defines how the dashboard talks to external observability providers (GlitchTip, PostHog, …) without coupling the UI to any of them.

There are three monitor *families*, each independent:

- **`errorMonitor`** — issues, events, error stats (currently: GlitchTip)
- **`logMonitor`** — log aggregation with filtering (currently: GlitchTip)
- **`trackerMonitor`** — visitor timeline / live users (currently: PostHog)

All three follow the same shape. This doc describes that shape once, then shows how to add a new adapter.

## What decides which adapter runs

**Strapi admin, not an env var.** Every dashboard project is a Strapi entry that declares:

- its **mapped tools** — which tool (`glitchtip`, `posthog`, …) backs which strategy (`error-monitor`, `log-monitor`, `tracker-monitor`);
- its **tool configurations** — the connection details for each tool (instance URL, organization, project id).

The only thing left in the environment is the **API secret** of each vendor (`GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY`). See [configuration.md](configuration.md).

Everything downstream is keyed on the Strapi `documentId` of the selected project.

## The pattern

```mermaid
classDiagram
    class FactoryInterface~TStrategy~ {
        <<interface>>
        +support(documentId, strategyResolver) Promise~boolean~
        +createConnection(documentId) Promise~ToolConnection~
        +createStrategy(connection) TStrategy
    }
    class StrategyInterface {
        <<interface>>
        +getX(params) Promise~Result~
    }
    class AbstractVendorFactory {
        <<abstract>>
        #TOOL_RESOLVER: string
        +support(documentId, strategyResolver) Promise~boolean~
        +createConnection(documentId) Promise~ToolConnection~
        +createVendorClient(connection) HttpClient
    }
    class ConcreteFactory {
        +createStrategy(connection) StrategyInterface
    }
    class Resolver {
        -factories: FactoryInterface[]
        -STRATEGY_RESOLVER: string
        +resolve(documentId) Promise~FactoryInterface~
    }
    class GetMonitor {
        <<function>>
        +getMonitor(documentId) Promise~FactoryInterface~
    }
    class ToolConfigurationStrategy {
        +isConfigure(documentId, strategy, toolSlug) Promise~boolean~
        +resolveConnection(documentId) Promise~ToolConnection~
    }
    class ConcreteStrategy {
        -client: HttpClient
        +getX(params) Promise~Result~
    }
    class HttpClient {
        +get(path)
        +post(path, body)
    }

    FactoryInterface <|.. ConcreteFactory
    AbstractVendorFactory <|-- ConcreteFactory
    StrategyInterface <|.. ConcreteStrategy
    Resolver o-- FactoryInterface : holds list
    AbstractVendorFactory --> ToolConfigurationStrategy : asks Strapi
    ConcreteFactory --> ConcreteStrategy : createStrategy
    ConcreteStrategy --> HttpClient : uses
    GetMonitor --> Resolver : uses
    GetMonitor ..> FactoryInterface : returns
```

### Roles

- **Strategy interface** — the contract the data-access layer depends on. Stable across providers.
- **`FactoryInterface<TStrategy>`** ([shared/factory/FactoryInterface.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/shared/factory/FactoryInterface.ts)) — the three-step contract every factory honours: *do you support this project?* → *give me its connection* → *build me a strategy*.
- **Abstract vendor factory** ([shared/factory/](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/shared/factory/)) — one per vendor (`AbstractGlitchTipFactory`, `AbstractPostHogFactory`). Owns everything that is vendor-specific but family-agnostic: the tool slug, the Strapi lookup, the connection type guard, and the HTTP client construction (including the env secret check). Shared by every family using that vendor.
- **Concrete factory** — one per (family × vendor). Implements only `createStrategy(connection)`.
- **Resolver** — holds the family's factory list and its `STRATEGY_RESOLVER` name. Returns the first factory whose `support()` answers true, throws otherwise.
- **`get<Family>Monitor(documentId)`** — the public entry point. Returns the resolved **Factory** (not a Strategy). Marked `import "server-only"`.
- **Tool configuration strategy** ([config/domain/tool/](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/config/domain/tool/)) — the Strapi seam. `isConfigure()` answers the mapped-tool question, `resolveConnection()` reads the tool configuration. Both wrapped in React `cache()` so one request hits Strapi once.
- **Concrete Strategy** — provider-specific implementation. Holds an HTTP client, runs requests, calls **Mappers** to translate DTOs to domain types.
- **HTTP client** — low-level transport (`GlitchTipClient`, `PostHogClient`). No business logic.

### The two constants that must match Strapi

| Constant | Declared in | Values today |
|---|---|---|
| `STRATEGY_RESOLVER` | each family's `<Family>MonitorResolver.ts` | `error-monitor`, `log-monitor`, `tracker-monitor` |
| `TOOL_RESOLVER` | each `shared/factory/Abstract<Vendor>Factory.ts` | `glitchtip`, `posthog` |

A project whose Strapi mapped tools do not pair those two strings gets a thrown resolver error — an intentional, visible failure rather than a silent fallback.

## Resolution flow

```mermaid
sequenceDiagram
    participant Caller as Data access layer
    participant Get as getErrorMonitorFactory()
    participant Resolver as ErrorMonitorResolver
    participant Factory as GlitchTipFactory
    participant Config as GlitchtipConfigurationStrategy
    participant Strapi
    participant Strategy as GlitchTipErrorMonitorStrategy

    Caller->>Get: getErrorMonitorFactory(documentId)
    Get->>Resolver: resolve(documentId)
    loop for each registered factory
        Resolver->>Factory: support(documentId, "error-monitor")
        Factory->>Config: isConfigure(documentId, "error-monitor", "glitchtip")
        Config->>Strapi: GraphQL — does this project map that tool?
        Strapi-->>Config: strategies[]
        Config-->>Factory: true
    end
    Resolver-->>Caller: factory

    Caller->>Factory: createConnection(documentId)
    Factory->>Config: resolveConnection(documentId)
    Config->>Strapi: GraphQL — project tool configurations
    Strapi-->>Config: { url, organization, projectId }
    Config-->>Caller: ToolConnection

    Caller->>Factory: createStrategy(connection)
    Factory->>Factory: read GLITCHTIP_TOKEN, build GlitchTipClient
    Factory->>Strategy: new GlitchTipErrorMonitorStrategy(client, orgSlug)
    Factory-->>Caller: strategy

    Caller->>Strategy: getIssues(connection.projectId)
```

The call site is always the same three lines:

```typescript
const factory = await getErrorMonitorFactory(documentId);
const connection = await factory.createConnection(documentId);
const strategy = factory.createStrategy(connection);
```

`connection.projectId` is the **provider's** project id (GlitchTip numeric id, PostHog project id) — never the Strapi `documentId`. Confusing the two is the most common wiring bug in this codebase.

## The three monitor families

### errorMonitor

[src/lib/errorMonitor/strategy/ErrorMonitorStrategyInterface.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/errorMonitor/strategy/ErrorMonitorStrategyInterface.ts)

```typescript
export interface ErrorMonitorStrategyInterface {
  getIssues(projectId: string, filters?: IssueFilters): Promise<Issue[]>;
  getErrorStats(projectId: string, period: Period, environment?: string): Promise<TimeSeriesPoint[]>;
  getIssue(issueId: string): Promise<Issue>;
  getIssueLatestEvent(issueId: string): Promise<IssueEvent | null>;
  getIssueEvents(issueId: string, limit?: number): Promise<IssueEvent[]>;
  getIssueComments(issueId: string): Promise<IssueComment[]>;
}
```

- **Strapi strategy name:** `error-monitor`
- **Entry point:** [GetErrorMonitor.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/errorMonitor/GetErrorMonitor.ts) — `getErrorMonitorFactory(documentId)`
- **Registered adapters:** `glitchtip` ([GlitchTipErrorMonitorFactory.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorFactory.ts))
- **Domain types:** `Issue`, `IssueEvent`, `IssueComment`, `TimeSeriesPoint`, `ErrorLevel`

### logMonitor

[src/lib/logMonitor/strategy/LogMonitorStrategyInterface.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/logMonitor/strategy/LogMonitorStrategyInterface.ts)

```typescript
export interface LogMonitorStrategyInterface {
  getLogs(projectId: string, filters?: LogFilters, period?: Period): Promise<Log[]>;
}
```

- **Strapi strategy name:** `log-monitor`
- **Entry point:** [GetLogMonitor.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/logMonitor/GetLogMonitor.ts) — `getLogMonitor(documentId)`
- **Registered adapters:** `glitchtip` ([GlitchTipLogMonitorFactory.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorFactory.ts))
- **Domain types:** `Log`, `LogLevel`, `LogFilters`

> The reservations feature consumes this monitor with a tag filter (`reservation.sent`) to aggregate business events on top of the log layer.

### trackerMonitor

[src/lib/trackerMonitor/strategy/TrackerMonitorStrategyInterface.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/trackerMonitor/strategy/TrackerMonitorStrategyInterface.ts)

```typescript
export interface TrackerMonitorStrategyInterface {
  getActiveUsersTimeline(
    projectId: string,
    windowMinutes: number,
  ): Promise<VisitorsTimeSeriesPoint[]>;
}
```

- **Strapi strategy name:** `tracker-monitor`
- **Entry point:** [GetTrackerMonitor.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/trackerMonitor/GetTrackerMonitor.ts) — `getTrackerMonitor(documentId)`
- **Registered adapters:** `posthog` ([PostHogFactory.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/trackerMonitor/adapters/posthog/PostHogFactory.ts))
- **Domain types:** `VisitorsTimeSeriesPoint`

## Anatomy of an adapter

Vendor plumbing lives once, in the abstract factory:

```typescript
// src/lib/shared/factory/AbstractPosthogFactory.ts
const TOOL_RESOLVER = "posthog";

export abstract class AbstractPostHogFactory {
  async support(documentId: string, strategyResolver: string): Promise<boolean> {
    return await new PosthogConfigurationStrategy()
      .isConfigure(documentId, strategyResolver, TOOL_RESOLVER);
  }

  createConnection(documentId: string): Promise<ToolConnection> {
    return new PosthogConfigurationStrategy().resolveConnection(documentId);
  }

  createPostHogClient(connection: ToolConnection): PostHogClient {
    const token = process.env.POSTHOG_PERSONAL_API_KEY;
    if (!token) {
      throw new Error("PostHog env var missing: POSTHOG_PERSONAL_API_KEY is required.");
    }
    return new PostHogClient({
      baseUrl: connection.baseUrl,
      token,
      projectId: connection.projectId,
    });
  }
}
```

The family adapter adds only the strategy wiring:

```typescript
// src/lib/trackerMonitor/adapters/posthog/PostHogFactory.ts
export class PostHogFactory
  extends AbstractPostHogFactory
  implements TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface>
{
  createStrategy(connection: ToolConnection): PostHogStrategy {
    return new PostHogStrategy(this.createPostHogClient(connection));
  }
}
```

When a vendor's connection carries more than `{ baseUrl, projectId }`, the abstract factory also exposes a type guard. GlitchTip needs an organization slug, so `AbstractGlitchTipFactory` provides `isGlitchtipConnection()` and each `createStrategy()` rejects a connection without it. PostHog adds no field beyond `ToolConnection`, so it has no guard — adding one would assert nothing.

The Strategy holds the business logic for translating the interface methods into HTTP calls and mapping DTOs:

```mermaid
flowchart LR
    DA[Data access] -->|calls| Strategy[ConcreteStrategy]
    Strategy -->|HTTP| Client[HttpClient]
    Client -->|raw JSON| DTO[DTO type]
    DTO -->|via Mapper| Domain[Domain type]
    Strategy -->|returns| Domain
```

DTOs (`GlitchTipIssueDto`, `PostHogQueryResponseDto`, …) mirror the external API shape exactly. Mappers translate them into our internal `Issue`, `Log`, `VisitorsTimeSeriesPoint`, so the rest of the codebase never sees a provider-specific field.

## Adding a new adapter

Suppose you want to add **Sentry** as a second `errorMonitor` backend.

### 1. Register the tool slug

[src/lib/errorMonitor/ErrorMonitorTypeEnums.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/errorMonitor/ErrorMonitorTypeEnums.ts):

```typescript
export const GLITCHTIP = "glitchtip";
export const SENTRY = "sentry"; // <-- add

export const errorMonitorMapper: ErrorMonitorType = {
  toolList: [GLITCHTIP, SENTRY], // <-- add
};
```

### 2. Add the Strapi seam for the vendor

A new vendor needs a tool configuration strategy next to the existing ones, implementing [ToolConfigurationStrategyInterface](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/config/domain/tool/ToolConfigurationStrategyInterface.ts):

```text
src/lib/config/domain/tool/SentryConfigurationStrategy.ts
  SentryConfiguration  (kind: "sentry", url, projectId, organization, …)
  SentryConnection extends ToolConnection
  isConfigure() / resolveConnection()   — both wrapped in cache()
```

Then add `SentryConfiguration` to the [ToolConfiguration](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/config/domain/tool/ToolConfiguration.ts) union and map its Strapi component in [projectMapper.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/config/domain/mappers/projectMapper.ts).

### 3. Add the abstract vendor factory

```typescript
// src/lib/shared/factory/AbstractSentryFactory.ts
const TOOL_RESOLVER = "sentry";

export abstract class AbstractSentryFactory {
  async support(documentId: string, strategyResolver: string): Promise<boolean> {
    return await new SentryConfigurationStrategy()
      .isConfigure(documentId, strategyResolver, TOOL_RESOLVER);
  }

  createConnection(documentId: string): Promise<ToolConnection> {
    return new SentryConfigurationStrategy().resolveConnection(documentId);
  }

  createSentryClient(connection: ToolConnection): SentryClient {
    const token = process.env.SENTRY_TOKEN;
    if (!token) throw new Error("Sentry env var missing: SENTRY_TOKEN is required.");
    return new SentryClient({ baseUrl: connection.baseUrl, token });
  }
}
```

This step is skipped entirely when the vendor already exists — a second family reusing GlitchTip just extends `AbstractGlitchTipFactory`, as `logMonitor` does.

### 4. Create the adapter folder

```text
src/lib/errorMonitor/adapters/sentry/
├── SentryErrorMonitorFactory.ts   # extends AbstractSentryFactory, only createStrategy()
├── SentryStrategy.ts              # implements ErrorMonitorStrategyInterface
├── dto/                           # raw API response shapes
└── mappers/                       # DTO -> domain
```

The low-level HTTP client goes under `src/lib/tool/sentry/SentryClient.ts` — transport only.

### 5. Implement the Strategy

Match every method of `ErrorMonitorStrategyInterface`. Inside each method: HTTP call → DTO → Mapper → domain object. Tests mock the HTTP client and assert the mapper output.

### 6. Register in GetErrorMonitor

[src/lib/errorMonitor/GetErrorMonitor.ts](https://github.com/webteamuxco/dashboard-monitor/tree/main/apps/dashboard/src/lib/errorMonitor/GetErrorMonitor.ts):

```typescript
const factories: ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>[] = [
  new GlitchTipFactory(),
  new SentryErrorMonitorFactory(), // <-- add
];
```

### 7. Document the secret and map the tool

Add `SENTRY_TOKEN` to `.env.example` and [docs/configuration.md](configuration.md). Then, in Strapi admin, map the `sentry` tool to the `error-monitor` strategy of the target project and fill its tool configuration (url, organization, project id).

Nothing else changes: no UI, hook, API route or data-access edit. Switching a project from GlitchTip to Sentry is a Strapi edit, and it can differ per project.

## Adding a new monitor family

If you need a *new family* (e.g. uptime monitoring), mirror the structure of `src/lib/errorMonitor/`:

```text
src/lib/uptimeMonitor/
├── domain/                      # internal types
├── strategy/
│   └── UptimeMonitorStrategyInterface.ts
├── factory/
│   ├── UptimeMonitorFactoryInterface.ts   # alias of FactoryInterface<TStrategy>
│   └── UptimeMonitorResolver.ts           # STRATEGY_RESOLVER = "uptime-monitor"
├── adapters/<provider>/
│   ├── <Provider>UptimeMonitorFactory.ts
│   ├── <Provider>Strategy.ts
│   ├── dto/
│   └── mappers/
├── UptimeMonitorTypeEnums.ts
└── GetUptimeMonitor.ts          # public entry point
```

Then declare the `uptime-monitor` strategy in Strapi admin and map a tool to it. No env var is involved in family resolution.

## Testing strategy

- **Mappers** — pure functions, test with a frozen DTO fixture asserting the output shape.
- **Strategies** — mock the HTTP client, verify that the right path/params are called and the mapper output flows through.
- **Factories** — mock the tool configuration strategy; assert `support()` forwards `(documentId, strategy, toolSlug)`, `createConnection()` delegates, and `createStrategy()` throws on a missing secret.
- **Resolver / entry point** — assert it returns the supporting factory and throws when none matches.

Never let a factory test reach `StrapiClientFactory`: an unmocked configuration strategy fails on missing `STRAPI_*` env vars. See [tests/CLAUDE.md](https://github.com/webteamuxco/dashboard-monitor/tree/main/tests/CLAUDE.md).

## Common pitfalls

- **Importing a `Get*Monitor` from a client component.** Fails at build time because of `import "server-only"`. Intentional — keep monitor logic on the server.
- **Passing the Strapi `documentId` where a provider project id is expected.** Strategies take `connection.projectId`; only the factory and the resolver speak `documentId`.
- **Forgetting to register the new Factory in `Get*Monitor.ts`.** The resolver throws `No <X>Factory supports type "<strategy>"` — the same message you get when the Strapi mapping is missing, so check both.
- **Leaking provider DTO types upward.** The data access layer must only see domain types (`Issue`, `Log`, …). Importing `GlitchTipIssueDto` in `IssuesDataAccess.ts` means a missing mapper.
