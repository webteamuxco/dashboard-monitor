export const issuesKeys = {
  recentKpi: (kpiSlug: string, limit: number) =>
    ["issues", "recent", kpiSlug, limit] as const,
  detail: (issueId: string) => ["issues", "detail", issueId] as const,
  isConfig: (
    panelSlug: string | null = null,
  ) => ["issues", "isConfig", panelSlug] as const,
};
