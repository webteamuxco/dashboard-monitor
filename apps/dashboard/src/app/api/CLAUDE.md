# src/app/api — Backend-for-Frontend

Thin Next.js route handlers. One route per data view consumed by a feature. The browser polls these routes via TanStack Query.

## Layout

```
src/app/api/
├── error-rate/route.ts
├── issues/
│   ├── route.ts
│   └── [id]/route.ts
├── reservations/route.ts
└── visitors/...
```

One folder per feature. Use `[param]` segments for resource ids, never query strings for ids.

## Route conventions

Every route handler must:

1. **Opt out of caching.** First line after imports:
   ```ts
   export const dynamic = "force-dynamic";
   ```
   The dashboard is real-time; stale data is worse than slow data. Polling cadence is controlled client-side via TanStack Query, not via Next caching.

2. **Be thin.** Parse params, call the data-access layer, return JSON. No business logic, no provider calls, no mapping. If logic creeps in, push it into `src/app/features/<name>/data-access/`.

3. **Validate query params.** Required params missing → `400 { error: "..." }`. Numeric ranges out of bounds → `400`. Keep messages actionable (name the param).

4. **Call the data-access singleton.** `import { issuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess"`. Never call a monitor strategy directly from a route.

5. **Wrap upstream failures.** `try/catch` around the data-access call, return `502 { error: message }` on throw. Don't expose stack traces.

6. **Response shape**: `{ data: T }` on success, `{ error: string }` on failure. Keep it consistent — the client fetchers (`fetchIssuesClient`, …) rely on it.

## Template

```ts
import { NextRequest, NextResponse } from "next/server";
import { issuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "Query param 'projectId' is required." },
      { status: 400 },
    );
  }

  try {
    const data = await issuesDataAccess.getRecentUnresolved(projectId);
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
