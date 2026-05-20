# tests — Vitest conventions

Unit tests with **Vitest** (`environment: "node"`, `globals: false`). Config: [vitest.config.ts](../vitest.config.ts).

## Layout — mirror `src/`

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

## Path aliases

- `@/...` resolves to `src/...` (same as runtime).
- `server-only` is aliased to `tests/shims/server-only.ts` (an empty module) so server-only code can be imported from tests without erroring.

Both aliases are configured in [vitest.config.ts](../vitest.config.ts). Don't shadow them.

## What to test where

| Layer | Test focus |
|---|---|
| `src/lib/<family>/Get<Family>Monitor.ts` | resolver wiring: which Factory comes back for a documentId, and the failure when none matches |
| `src/lib/<family>/factory/...Resolver.ts` | `support(documentId, strategy)` dispatch, error when no factory matches |
| `src/lib/<family>/adapters/<provider>/<Provider>Factory.ts` | `support` / `createConnection` delegation to the config strategy, secret validation in `createStrategy` |
| `src/lib/<family>/adapters/<provider>/` | strategy methods + DTO→domain mappers. **Mock the HTTP client**, not `fetch`. |
| `src/lib/tool/{glitchtip,posthog}/*Client.ts` | URL building, auth header, status-code handling. Mock `fetch`. |
| `src/app/features/*/data-access/...DataAccess.ts` | composition + view-model mapping. Mock the monitor family's `get<Family>Monitor`. |
| `src/app/features/*/data-access/fetch*Client.ts` | `fetch` wrapper behavior. Mock `fetch`. |

Coverage excludes (see [vitest.config.ts](../vitest.config.ts)): `domain/**`, `dto/**`, `*Interface.ts`, `queryKeys.ts`, `src/app/api/**`. Don't add tests just to cover these — they're plain types or thin glue covered by the layer above.

## Mocking conventions

- **Mock at the lowest meaningful seam.** For an adapter strategy, mock the HTTP client (`GlitchTipClient`), not `fetch`. For a factory or a composition root, mock the tool configuration strategy (`GlitchtipConfigurationStrategy`, `PosthogConfigurationStrategy`) — that is the only thing standing between the code and Strapi. For data-access, mock `get<Family>Monitor`.
- **Never let Strapi be reached.** A factory's `support()` hits `StrapiClientFactory` as soon as it is unmocked, which fails on missing `STRAPI_*` env vars — the sign that the mock is at the wrong level.
- **Env vars**: in `beforeEach`, `delete` the secrets you intend to test (`GLITCHTIP_TOKEN`, `POSTHOG_PERSONAL_API_KEY`) so cross-test pollution can't hide bugs. Set them per `it` block.
- **No real network**. Ever. If a test hits a live vendor URL, fix the test.

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

  it("resolves the factory of the tool mapped to the project", async () => {
    isConfigureMock.mockResolvedValue(true);

    await expect(getErrorMonitorFactory("doc1")).resolves.toBeInstanceOf(GlitchTipFactory);
    expect(isConfigureMock).toHaveBeenCalledWith("doc1", "error-monitor", "glitchtip");
  });

  it("rejects when nothing is mapped in admin", async () => {
    isConfigureMock.mockResolvedValue(false);

    await expect(getErrorMonitorFactory("doc1")).rejects.toThrow(
      /No ErrorMonitorFactory supports type "error-monitor"/,
    );
  });
});
```

## Running

```bash
pnpm test                # one-shot
pnpm test:watch
pnpm test:coverage       # html report in coverage/
```

Run targeted tests with `pnpm vitest run tests/lib/errorMonitor/adapters/glitchtip` while iterating, then full `pnpm test` before pushing.
