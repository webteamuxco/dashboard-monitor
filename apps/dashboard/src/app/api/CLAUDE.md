# src/app/api — Backend-for-Frontend

Thin Next.js route handlers. One route per data view consumed by a feature. The browser polls these routes via TanStack Query.

## Layout

```
src/app/api/
├── config/projects/
│   ├── route.ts                        # the project catalog
│   └── [projectId]/
│       ├── route.ts                    # one project: defaultConfig, timeInterval
│       ├── panels/route.ts             # the project's dashboard panels, ordered
│       └── strategies/route.ts         # ?selectedPanel=<panelSlug> → the panel's strategies
├── error-rate/route.ts
├── issues/
│   ├── route.ts
│   └── [id]/route.ts
├── reservations/route.ts
└── visitors/timeline/route.ts
```

One folder per feature. Use `[param]` segments for resource ids, never query strings for ids — the `config` routes follow this; the data routes below are the documented exception.

## Which id each route expects

| Route | `documentId` / `[projectId]` is a… |
|---|---|
| `/api/config/projects` | — |
| `/api/config/projects/[projectId]` | **project** id |
| `/api/config/projects/[projectId]/panels` | **project** id |
| `/api/config/projects/[projectId]/strategies?selectedPanel` | **project** id + panel **slug** |
| `/api/issues`, `/api/issues/[id]`, `/api/error-rate`, `/api/reservations`, `/api/visitors/timeline` | **panel** id, passed as `?documentId=` |

Every data route's `documentId` query param carries the selected **dashboard panel**'s Strapi `documentId`, because the panel is what maps a tool and holds its connection details. The param name is a leftover from when wiring lived on the project — don't read it as a project id, and don't rename it in isolation (client fetchers, hooks and the monitor layer all use the same name). See the root [CLAUDE.md](../../../../../CLAUDE.md#the-panel-system--read-this-before-touching-any-data-path).

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

7. **Response shape**: `{ data: T }` on success, `{ error: string }` on failure. Keep it consistent — the client fetchers (`fetchIssuesClient`, …) rely on it. `data` may legitimately be `null` (a project with no panels, a panel with no strategies); the fetchers pass that through and the UI renders an empty state.

8. **`params` is a Promise.** Next 16 dynamic segments: `{ params }: { params: Promise<{ projectId: string }> }`, then `const { projectId } = await params;`.

## Template

```ts
import { NextRequest, NextResponse } from "next/server";
import { issuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // The selected dashboard panel's Strapi documentId — what the monitor layer resolves a factory from.
  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json(
      { error: "Query param 'documentId' is required." },
      { status: 400 },
    );
  }

  try {
    const data = await issuesDataAccess.getRecent(documentId);
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
