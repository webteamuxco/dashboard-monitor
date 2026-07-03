// Isomorphic (server + client): both page.tsx prefetch and the Zustand store
// resolve the same default so the hydrated query key matches the client's.
// `null` means "all environments" (no filter).

export function parseEnvironmentOptions(): string[] {
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_ENVIRONMENTS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export const ENVIRONMENT_OPTIONS = parseEnvironmentOptions();

export function resolveDefaultEnvironment(): string | null {
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_DEFAULT_ENVIRONMENT?.trim();
  if (raw && ENVIRONMENT_OPTIONS.includes(raw)) return raw;
  return ENVIRONMENT_OPTIONS[0] ?? null;
}
