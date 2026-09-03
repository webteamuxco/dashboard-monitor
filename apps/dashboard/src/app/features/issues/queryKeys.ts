export const issuesKeys = {
  recent: (documentId: string, limit: number, environment: string | null = null) =>
    ["issues", "recent", documentId, limit, environment] as const,
  detail: (issueId: string, environment: string | null = null) =>
    ["issues", "detail", issueId, environment] as const,
  isConfig: (
    documentId: string,
    environment: string | null = null,
    panelSlug: string | null = null,
  ) => ["issues", "isConfig", documentId, environment, panelSlug] as const,
};
