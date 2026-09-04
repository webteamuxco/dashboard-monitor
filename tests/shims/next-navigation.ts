/**
 * `next` lives in apps/dashboard/node_modules, so the suite at the root cannot
 * resolve — and therefore cannot `vi.mock` — "next/navigation". The Vitest
 * config aliases it here instead.
 *
 * The real `useSearchParams` returns null outside an app-router context, which
 * is every render in jsdom. This shim hands back a URLSearchParams a test can
 * write to before rendering, via `setTestSearchParams`.
 */
let searchParams = new URLSearchParams();

/** Replaces the params every `useSearchParams()` call will read. */
export function setTestSearchParams(init?: string | Record<string, string>) {
  searchParams = new URLSearchParams(init);
}

export function useSearchParams(): URLSearchParams {
  return searchParams;
}
