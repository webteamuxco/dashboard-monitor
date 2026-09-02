# tests — Vitest conventions

Unit tests with **Vitest** (`globals: false`), **node by default**, **jsdom on demand**. Config: [vitest.config.ts](../vitest.config.ts).

## Where this suite lives

The suite sits at the **monorepo root**, not inside `apps/dashboard`, even though everything it covers is dashboard code. The root config wires the two together:

- `root: __dirname` (repo root), `include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]`
- `@/...` → `apps/dashboard/src/...` (same meaning as at runtime)
- `server-only` → [shims/server-only.ts](shims/server-only.ts), an empty module, so server-only code is importable from tests
- `dedupe: ["react", "react-dom", "@tanstack/react-query", "zustand"]` — these live in `apps/dashboard`, and the root `package.json` pins the *same versions* as devDependencies so the suite can import them. Deduping keeps a single instance: two React copies break every hook, two QueryClient copies break every provider lookup. **Bump them in both manifests at once.**
- `setupFiles: ["./tests/setup/cleanup.ts"]` — unmounts components between tests
- coverage `include` covers `.ts` and `.tsx`

The `test` / `test:watch` / `test:coverage` scripts are declared by the **dashboard** package and run through Turborepo, so `pnpm test` from the root is the normal entry point. There is no second Vitest config inside `apps/dashboard` — don't add one.

The suite sits outside every app's tsconfig and ESLint run, so the root carries its own pair for it:

- [tsconfig.json](../tsconfig.json) — `strict`, `@/*` → `apps/dashboard/src/*`, includes `tests/**` and `vitest.config.ts`. Run by `pnpm typecheck:tests`, which `pnpm typecheck` chains after the per-app ones.
- [eslint.config.mjs](../eslint.config.mjs) — `typescript-eslint` on `tests/**`, ignoring `apps/**` (each app lints itself). Run by `pnpm lint:tests`, chained from `pnpm lint`.

So `pnpm typecheck && pnpm lint && pnpm test` really covers these files — the husky pre-commit hook runs all three. Write tests as strictly typed as production code: no `any`, no `as unknown as X`.

## Node or jsdom

Default is node. A file that renders React opts in with a pragma on its **first line**:

```ts
// @vitest-environment jsdom
```

Use jsdom for hooks, stores that touch `localStorage`, and components. Everything else — mappers, repositories, data-access orchestrators, fetch wrappers, query keys — stays in node.

## Helpers

| Helper | Use |
|---|---|
| [helpers/renderHook.ts](helpers/renderHook.ts) | `renderQueryHook(hook, props)` renders a hook in a fresh `QueryClientProvider`; `renderWithQuery(element)` does the same for a component; `renderQueryHookWithClient` also hands back the client, and `refetchIntervalOf(client, key)` reads the resolved polling interval without racing timers |
| [helpers/queryClient.ts](helpers/queryClient.ts) | `createTestQueryClient()` — retries off, no caching, so one assertion means one fetch |
| [helpers/fetchMock.ts](helpers/fetchMock.ts) | `mockOk` / `mockError` / `mockUnparseableError` stub `fetch` with the BFF envelopes; `calledUrl` / `calledParams` / `calledInit` read the last call |
| [setup/cleanup.ts](setup/cleanup.ts) | global `afterEach(cleanup)` — see below |

Test files are written as `.ts`, never `.tsx`: components are instantiated with `createElement` so no test needs a JSX transform of its own.

### Cleanup is not optional

With `globals: false`, testing-library registers no cleanup. Without [setup/cleanup.ts](setup/cleanup.ts), components mounted by one test survive into the next, their effects keep running, and they keep writing to the module-level Zustand stores — which shows up as baffling cross-test failures ("found multiple elements", a store holding another test's panel). Reset the stores you touch in `beforeEach` as well, and `localStorage.clear()` when the store is persisted.

## Layout — mirror `apps/dashboard/src/`

```
tests/
├── app/
│   └── features/<feature>/...   # mirrors src/app/features/<feature>/
├── lib/
│   ├── config/domain/...        # mirrors src/lib/config/domain/
│   ├── errorMonitor/...         # mirrors src/lib/errorMonitor/
│   ├── logMonitor/...
│   ├── trackerMonitor/...
│   ├── glitchtip/...            # mirrors src/lib/tool/glitchtip/
│   └── posthog/...              # mirrors src/lib/tool/posthog/
├── helpers/                     # test-only utilities (not discovered as tests)
├── setup/                       # setupFiles
└── shims/
    └── server-only.ts           # neutralizes the "server-only" guard during tests
```

Test file naming: `<SourceFile>.test.ts`. A few files cover a whole contract across features instead of one source file, and are named for it: [queryKeys.test.ts](app/features/queryKeys.test.ts) (every key shape), [pollingContract.test.ts](app/features/pollingContract.test.ts) (`refetchInterval` for every data hook), [panelHooks.test.ts](app/features/panelHooks.test.ts).

## What to test where

| Layer | Test focus |
|---|---|
| `src/lib/<family>/Get<Family>Monitor.ts` | resolver wiring: which Factory comes back for a panel id, and the failure when none matches |
| `src/lib/<family>/factory/...Resolver.ts` | `support(panelId, strategy)` dispatch, error when no factory matches |
| `src/lib/<family>/adapters/<provider>/<Provider>Factory.ts` | `support` / `createConnection` delegation to the config strategy, secret validation in `createStrategy` |
| `src/lib/<family>/adapters/<provider>/` | strategy methods + DTO→domain mappers. **Mock the HTTP client**, not `fetch`. |
| `src/lib/tool/{glitchtip,posthog}/*Client.ts` | URL building, auth header, status-code handling. Mock `fetch`. |
| `src/lib/config/domain/mappers/projectMapper.ts` | DTO→domain renaming, including `mapDashboardPanel` (`display_name` → `displayName`, `documentId` → `id`) |
| `src/app/features/*/data-access/...DataAccess.ts` | composition + view-model mapping. Mock the monitor family's `get<Family>Monitor`. |
| `src/app/features/*/data-access/fetch*Client.ts` | `fetch` wrapper behavior: URL, params, `no-store`, `{ data }` unwrapping, `{ error }` and unparseable-body paths. Mock `fetch`. |
| `src/lib/config/domain/StrapiRepository.ts` | endpoint + Bearer, GraphQL error paths, and **the variables each query sends**. Also guards the query ↔ DTO coupling (`timeInterval`, `__typename`). Mock `fetch`. |
| `src/lib/config/domain/tool/*ConfigurationStrategy.ts` | `isConfigure` forwarding and every explicit `resolveConnection` failure. Mock `StrapiClientFactory`. |
| `src/app/features/*/queryKeys.ts` | key shapes — the contract between the server prefetch and the client hooks |
| `src/app/features/*/hooks/use*.ts` | the key used, the fetcher arguments, `enabled` gating, `refetchInterval`. Mock the client fetcher, keep TanStack Query real. |
| `src/app/features/dashboard/hooks/useActive*.ts` | rehydration and reconciliation against the fetched list |
| `src/app/features/dashboard/state/*.ts` | store defaults, actions, `skipHydration` + `persist.rehydrate()` |
| `src/app/features/dashboard/state/windowPresets.ts` | `presetsFromTimeInterval` conversion + the fallback when Strapi sends nothing |
| `DashboardContent` / `KpiRow` | **which widgets a strategy list mounts** — mock the widgets down to markers, keep the hooks real |
| `DashboardHeader` | the `NEXT_PUBLIC_DASHBOARD_INTERACTIVITY` gate on every control |
| `*Selector` components | options rendered, current value, what they write to the store |

Coverage excludes (see [vitest.config.ts](../vitest.config.ts)): `domain/**`, `dto/**`, `*Interface.ts`, `*TypeEnums.ts`, `src/app/api/**`, `src/components/**`, the app shell (`layout`/`page`/`providers`), and the presentational widgets (`*Panel.tsx`, `*Kpi.tsx`, `*KpiCard.tsx`, `*Sheet.tsx`, `KpiCard.tsx`) — a hook call plus Recharts markup, whose only real logic (which of them mounts) is covered through `DashboardContent` and `KpiRow`. Don't add tests just to cover these.

## Mocking conventions

- **Mock at the lowest meaningful seam.** For an adapter strategy, mock the HTTP client (`GlitchTipClient`), not `fetch`. For a factory or a composition root, mock the tool configuration strategy (`GlitchtipConfigurationStrategy`, `PosthogConfigurationStrategy`) — that is the only thing standing between the code and Strapi. For data-access, mock `get<Family>Monitor`. For a hook or a component, mock the **client fetcher** and let TanStack Query run: that is what verifies the query key wiring too.
- **Declare mock functions with `vi.hoisted`.** `vi.mock` is lifted above every `const`, so a factory that reads a plain top-level variable hits its temporal dead zone:
  ```ts
  const { fetchPanelsMock } = vi.hoisted(() => ({ fetchPanelsMock: vi.fn() }));
  vi.mock("@/app/features/config/data-access/fetchProjectPannels", () => ({
    fetchProjectPanels: fetchPanelsMock,
  }));
  ```
- **`await waitFor` on the value you assert**, not on the mock having been called — the fetcher resolves one tick before the hook re-renders with the data.
- **Wrap out-of-band store writes in `act()`** when a mounted component must re-render from them.
- **Never let Strapi be reached.** A factory's `support()` hits `StrapiClientFactory` as soon as it is unmocked, which fails on missing `STRAPI_*` env vars — the sign that the mock is at the wrong level.
- **Env vars**: in `beforeEach`, `delete` the secrets you intend to test (`GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY`) so cross-test pollution can't hide bugs. Set them per `it` block.
- **No real network**. Ever. If a test hits a live vendor URL, fix the test.

## The id under test is the panel id

Since the panel system landed, the `documentId` a factory, resolver or data-access method receives is the **panel**'s Strapi `documentId`, not the project's — the parameter name did not change (see the root [CLAUDE.md](../CLAUDE.md#the-panel-system--read-this-before-touching-any-data-path)). Fixtures like `"doc1"` are opaque strings so nothing breaks, but name them for what they are (`panelId`) in new tests, and assert the forwarded argument rather than assuming it.

## Template — server-side, `Get<Family>Monitor`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { isConfigureMock, resolveConnectionMock } = vi.hoisted(() => ({
  isConfigureMock: vi.fn(),
  resolveConnectionMock: vi.fn(),
}));

vi.mock("@/lib/config/domain/tool/GlitchtipConfigurationStrategy", () => ({
  GlitchtipConfigurationStrategy: class {
    isConfigure = isConfigureMock;
    resolveConnection = resolveConnectionMock;
  },
}));

import { getErrorMonitorFactory } from "@/lib/errorMonitor/GetErrorMonitor";
import { GlitchTipFactory } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorFactory";

describe("getErrorMonitorFactory", () => {
  beforeEach(() => {
    isConfigureMock.mockReset();
  });

  it("resolves the factory of the tool mapped to the panel", async () => {
    isConfigureMock.mockResolvedValue(true);

    await expect(getErrorMonitorFactory("panel1")).resolves.toBeInstanceOf(GlitchTipFactory);
    expect(isConfigureMock).toHaveBeenCalledWith("panel1", "error-monitor", "glitchtip");
  });

  it("rejects when nothing is mapped in admin", async () => {
    isConfigureMock.mockResolvedValue(false);

    await expect(getErrorMonitorFactory("panel1")).rejects.toThrow(
      /No ErrorMonitorFactory supports type "error-monitor"/,
    );
  });
});
```

## Template — client-side, a hook

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";

const { fetchIssuesClientMock } = vi.hoisted(() => ({
  fetchIssuesClientMock: vi.fn(),
}));

vi.mock("@/app/features/issues/data-access/fetchIssuesClient", () => ({
  fetchIssuesClient: fetchIssuesClientMock,
}));

import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { renderQueryHook } from "../../../../helpers/renderHook";

describe("useIssues", () => {
  beforeEach(() => {
    fetchIssuesClientMock.mockReset();
  });

  it("fetches with the panel documentId, the limit and the environment", async () => {
    fetchIssuesClientMock.mockResolvedValue([{ id: "i1" }]);

    const { result } = renderQueryHook(
      () => useIssues("panel-1", 20, "production", 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.data).toEqual([{ id: "i1" }]));
    expect(fetchIssuesClientMock).toHaveBeenCalledWith("panel-1", 20, "production");
  });
});
```

For a component, swap `renderQueryHook` for `renderWithQuery(createElement(Component, props))`.

## Running

```bash
pnpm test                # one-shot, from the repo root
pnpm test:watch
pnpm test:coverage       # html report in coverage/ (resolved from the Vitest root)
```

Run targeted tests with `pnpm vitest run tests/lib/errorMonitor/adapters/glitchtip` from the root while iterating, then full `pnpm test` before pushing.
