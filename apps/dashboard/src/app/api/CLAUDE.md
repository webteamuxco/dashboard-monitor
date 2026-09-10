# src/app/api — Backend-for-Frontend

Thin Next.js route handlers. One route per data view consumed by a feature. The browser polls these routes via TanStack Query.

## Layout

```
src/app/api/
├── config/
│   ├── projects/
│   │   ├── route.ts                    # the project catalog
│   │   └── [projectId]/
│   │       ├── route.ts                # one project: defaultConfig, timeInterval
│   │       └── panels/route.ts         # the project's dashboard panels, ordered
│   ├── dashboard-kpis/route.ts         # ?panelSlug=<slug> → the panel's KPIs
│   └── dashboard-blocks/route.ts       # ?panelSlug=<slug> → the panel's blocks
├── kpis/
│   ├── [kpiId]/route.ts                # one KPI's measure
│   └── issues/route.ts
├── blocks/
│   └── [blockId]/
│       ├── route.ts                    # one block's measure (list or series)
│       └── issues/[issueId]/
│           ├── route.ts                # the detail of one row of a list block
│           └── comments/route.ts       # POST a comment on that issue
├── error-rate/route.ts
└── visitors/timeline/route.ts
```

One folder per feature. Use `[param]` segments for resource ids, never query strings for ids — the `config`, `kpis` and `blocks` routes follow this; the remaining data routes are the documented exception.

## Which id each route expects

| Route | the id is a… |
|---|---|
| `/api/config/projects` | — |
| `/api/config/projects/[projectId]` | **project** id |
| `/api/config/projects/[projectId]/panels` | **project** id |
| `/api/config/dashboard-kpis?panelSlug` | panel **slug** |
| `/api/config/dashboard-blocks?panelSlug` | panel **slug** |
| `/api/kpis/[kpiId]` | **dashboard KPI** id |
| `/api/blocks/[blockId]`, `/api/blocks/[blockId]/issues/[issueId]`, `…/comments` | **dashboard block** id |
| `/api/kpis/issues`, `/api/error-rate`, `/api/visitors/timeline` | **dashboard KPI** id, passed as `?documentId=` |

Every data route's id carries a **dashboard element**'s Strapi `documentId` — a `DashboardKpi` or a `DashboardBlock` — because the element is what declares a strategy and holds its tool connection. Where it is still a `?documentId=` query param the name is a leftover from when the wiring lived on the project, then on the panel; don't read it as a project or panel id, and don't rename it in isolation (client fetchers, hooks and the data-access layer all use the same name). See the root [CLAUDE.md](../../../../../CLAUDE.md#the-panel-system--read-this-before-touching-any-data-path).

**`/api/blocks/[blockId]?tag=` names one of the element's own tags, never a query.** A log-monitor block declaring several tags is read one tag at a time — the provider ANDs the terms of a single query, so asking for all of them at once returns their intersection. The route forwards the raw param and `BlocksDataAccess` matches it against `strategy.tags`, throwing when it matches none: nothing the browser sends ever reaches the provider query verbatim. Omitting the param keeps the historical behaviour (every declared tag in one ANDed query), which is what a single-tag element wants.

**The element measures carry no type param.** `/api/kpis/[kpiId]` and `/api/blocks/[blockId]` read the absence of `windowMinutes` as "this element is not windowed": a KPI whose Strapi `type` is not `interval` reads a total, a block whose `type` draws no time series — anything but `rate`, `bar` and `stackedBar` — reads a list. The wiring does not carry the element's `type`, so never default that param — a default silently turns every total into a windowed count.

**A data route says which collection its id belongs to.** It passes an element kind as the first argument of the data-access call:

```ts
import { DASHBOARD_BLOCK } from "@/lib/config/domain/loadToolWiring";

const data = await blocksDataAccess.getMeasure(DASHBOARD_BLOCK, blockId, windowMinutes, environment, limit, tag);
```

The route is the only layer that knows this — it is what the URL means. The data-access layer turns the pair into a `ToolWiring`; the monitor layer never sees either. The `/api/kpis/*` routes pass `DASHBOARD_KPI`, the `/api/blocks/*` ones `DASHBOARD_BLOCK`, and nothing below them changes.

## Route conventions

Every route handler must:

1. **Opt out of caching.** First line after imports:
   ```ts
   export const dynamic = "force-dynamic";
   ```
   The dashboard is real-time; stale data is worse than slow data. Polling cadence is controlled client-side via TanStack Query, not via Next caching.

2. **Be thin.** Parse params, call the data-access layer, return JSON. No business logic, no provider calls, no mapping. If logic creeps in, push it into `src/app/features/<name>/data-access/`.

3. **Take a Strapi id, never a provider id.** The GlitchTip / PostHog project id is derived server-side from the panel's tool connection and must never come from the client.

4. **Validate params.** Required param missing → `400 { error: "..." }`. Numeric ranges out of bounds → `400`. Keep messages actionable (name the param). Optional filters (`environment`, `selectedPanel`) may be `null` — forward them as-is and let the data-access layer decide.

5. **Call the data-access singleton.** `import { issuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess"`. Never call a monitor strategy or `get<Family>Monitor` directly from a route.

6. **Wrap upstream failures.** `try/catch` around the data-access call, return `502 { error: message }` on throw. Don't expose stack traces. A missing Strapi mapping, an incomplete tool configuration and a provider outage all surface this way — with the original message, so the cause stays diagnosable.

7. **Response shape**: `{ data: T }` on success, `{ error: string }` on failure. Keep it consistent — the client fetchers (`fetchBlockMeasureClient`, …) rely on it. `data` may legitimately be `null` (a project with no panels, a panel with no strategies); the fetchers pass that through and the UI renders an empty state.

8. **`params` is a Promise.** Next 16 dynamic segments: `{ params }: { params: Promise<{ projectId: string }> }`, then `const { projectId } = await params;`.

## Template

```ts
import { NextRequest, NextResponse } from "next/server";
import { blocksDataAccess } from "@/app/features/blocks/data-access/BlocksDataAccess";
import { DASHBOARD_BLOCK } from "@/lib/config/domain/loadToolWiring";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> },
) {
  // The dashboard element's Strapi documentId — what the monitor layer resolves a factory from.
  const { blockId } = await params;
  if (!blockId) {
    return NextResponse.json(
      { error: "Path param 'blockId' is required." },
      { status: 400 },
    );
  }

  try {
    const data = await blocksDataAccess.getMeasure(DASHBOARD_BLOCK, blockId, null);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

## Adding a route

1. Pick a path that matches a single TanStack Query key (`/api/<feature>/<resource>`).
2. Create `src/app/api/<feature>/[...]/route.ts` from the template above.
3. Add the corresponding data-access method (`src/app/features/<feature>/data-access/`) — that's where logic and `cache()` deduplication live.
4. Add the matching client fetcher and hook in the feature folder ([src/app/features/CLAUDE.md](../features/CLAUDE.md)).

## What does NOT belong here

- Calls to monitor strategies (use data-access).
- Env-var reads for provider secrets (factories handle that).
- Mapping logic (data-access handles that).
- Auth / session work — none currently; if added, route through middleware not per-route.
