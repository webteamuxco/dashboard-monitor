# tests — Vitest conventions

Unit tests with **Vitest** (`environment: "node"`, `globals: false`). Config: [vitest.config.ts](../vitest.config.ts).

## Where this suite lives

The suite sits at the **monorepo root**, not inside `apps/dashboard`, even though everything it covers is dashboard code. The root config wires the two together:

- `root: __dirname` (repo root), `include: ["tests/**/*.test.ts"]`
- `@/...` → `apps/dashboard/src/...` (same meaning as at runtime)
- `server-only` → [shims/server-only.ts](shims/server-only.ts), an empty module, so server-only code is importable from tests
- coverage `include: ["apps/dashboard/src/**/*.ts"]`

The `test` / `test:watch` / `test:coverage` scripts are declared by the **dashboard** package and run through Turborepo, so `pnpm test` from the root is the normal entry point. There is no second Vitest config inside `apps/dashboard` — don't add one.

## Layout — mirror `apps/dashboard/src/`

```
tests/
├── app/
│   └── features/<feature>/...   # mirrors src/app/features/<feature>/
├── lib/
│   ├── errorMonitor/...         # mirrors src/lib/errorMonitor/
│   ├── logMonitor/...
│   ├── trackerMonitor/...
│   ├── glitchtip/...            # mirrors src/lib/tool/glitchtip/
│   └── posthog/...              # mirrors src/lib/tool/posthog/
└── shims/
    └── server-only.ts           # neutralizes the "server-only" guard during tests
```

Test file naming: `<SourceFile>.test.ts`. Test discovery: `tests/**/*.test.ts`.

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
| `src/app/features/*/data-access/fetch*Client.ts` | `fetch` wrapper behavior. Mock `fetch`. |
| `src/app/features/dashboard/state/windowPresets.ts` | `presetsFromTimeInterval` conversion + the fallback when Strapi sends nothing |

Coverage excludes (see [vitest.config.ts](../vitest.config.ts)): `domain/**`, `dto/**`, `*Interface.ts`, `queryKeys.ts`, `src/app/api/**`. Don't add tests just to cover these — they're plain types or thin glue covered by the layer above.

## Mocking conventions

- **Mock at the lowest meaningful seam.** For an adapter strategy, mock the HTTP client (`GlitchTipClient`), not `fetch`. For a factory or a composition root, mock the tool configuration strategy (`GlitchtipConfigurationStrategy`, `PosthogConfigurationStrategy`) — that is the only thing standing between the code and Strapi. For data-access, mock `get<Family>Monitor`.
- **Never let Strapi be reached.** A factory's `support()` hits `StrapiClientFactory` as soon as it is unmocked, which fails on missing `STRAPI_*` env vars — the sign that the mock is at the wrong level.
- **Env vars**: in `beforeEach`, `delete` the secrets you intend to test (`GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY`) so cross-test pollution can't hide bugs. Set them per `it` block.
- **No real network**. Ever. If a test hits a live vendor URL, fix the test.

## The id under test is the panel id

Since the panel system landed, the `documentId` a factory, resolver or data-access method receives is the **panel**'s Strapi `documentId`, not the project's — the parameter name did not change (see the root [CLAUDE.md](../CLAUDE.md#the-panel-system--read-this-before-touching-any-data-path)). Fixtures like `"doc1"` are opaque strings so nothing breaks, but name them for what they are (`panelId`) in new tests, and assert the forwarded argument rather than assuming it.

## Template — `Get<Family>Monitor` test

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const isConfigureMock = vi.fn();
const resolveConnectionMock = vi.fn();

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

## Running

```bash
pnpm test                # one-shot, from the repo root
pnpm test:watch
pnpm test:coverage       # html report in coverage/ (resolved from the Vitest root)
```

Run targeted tests with `pnpm vitest run tests/lib/errorMonitor/adapters/glitchtip` from the root while iterating, then full `pnpm test` before pushing.
