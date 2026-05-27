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
│   ├── glitchtip/...
│   └── posthog/...
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
| `src/lib/<family>/Get<Family>Monitor.ts` | env-var validation, resolver wiring, returned strategy shape |
| `src/lib/<family>/factory/...Resolver.ts` | `support()` dispatch, error when no factory matches |
| `src/lib/<family>/adapters/<provider>/` | strategy methods + DTO→domain mappers. **Mock the HTTP client**, not `fetch`. |
| `src/lib/{glitchtip,posthog}/*Client.ts` | URL building, auth header, status-code handling. Mock `fetch`. |
| `src/app/features/*/data-access/...DataAccess.ts` | composition + view-model mapping. Mock the monitor strategy. |
| `src/app/features/*/data-access/fetch*Client.ts` | `fetch` wrapper behavior. Mock `fetch`. |

Coverage excludes (see [vitest.config.ts](../vitest.config.ts)): `domain/**`, `dto/**`, `*Interface.ts`, `queryKeys.ts`, `src/app/api/**`. Don't add tests just to cover these — they're plain types or thin glue covered by the layer above.

## Mocking conventions

- **Mock at the lowest meaningful seam.** For an adapter, mock the HTTP client (`GlitchTipClient`), not `fetch`. For data-access, mock the strategy (`getErrorMonitor`), not the HTTP client.
- **Env vars**: in `beforeEach`, `delete` the vars you intend to test (`NEXT_PUBLIC_*`, `GLITCHTIP_*`, …) so cross-test pollution can't hide bugs. Set them per `it` block.
- **No real network**. Ever. If a test hits a live vendor URL, fix the test.

## Template — `Get<Family>Monitor` test

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getErrorMonitor } from "@/lib/errorMonitor/GetErrorMonitor";

describe("getErrorMonitor", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER;
    delete process.env.GLITCHTIP_URL;
    delete process.env.GLITCHTIP_TOKEN;
    delete process.env.GLITCHTIP_ORGANIZATION_SLUG;
  });

  it("throws when driver env is unset", () => {
    expect(() => getErrorMonitor()).toThrow(/NEXT_PUBLIC_ERROR_MONITOR_DRIVER/);
  });

  it("throws when no factory supports the driver", () => {
    process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER = "sentry";
    expect(() => getErrorMonitor()).toThrow(/No ErrorMonitorFactory supports type "sentry"/);
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
