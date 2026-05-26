export interface DashboardConfig {
  organizationSlug: string;
  projects: string[];
  pollingIntervalSec: number;
  metricsEndpoint: string;
}

export const POLLING_INTERVAL_BOUNDS = { min: 1, max: 300 } as const;

function parsePollingIntervalSec(raw: string | undefined): number {
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return 30;
  const { min, max } = POLLING_INTERVAL_BOUNDS;
  return Math.min(Math.max(Math.round(parsed), min), max);
}

export function getDefaultDashboardConfig(): DashboardConfig {
  return {
    organizationSlug:
      process.env.NEXT_PUBLIC_DASHBOARD_DEFAULT_ORGANIZATION_SLUG ?? "",
    projects: [],
    pollingIntervalSec: parsePollingIntervalSec(
      process.env.NEXT_PUBLIC_DASHBOARD_DEFAULT_POLLING_INTERVAL_SEC,
    ),
    metricsEndpoint:
      process.env.NEXT_PUBLIC_DASHBOARD_DEFAULT_METRICS_ENDPOINT ?? "",
  };
}
