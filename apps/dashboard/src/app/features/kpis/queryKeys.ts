export const dashboardKpiKeys = {
  config: (panelSlug: string | null) =>
    ["dashboardKpis", "config", panelSlug] as const,
  measure: (
    kpiId: string,
    windowMinutes: number | null,
    environment: string | null = null,
  ) => ["dashboardKpis", "measure", kpiId, windowMinutes, environment] as const,
};
