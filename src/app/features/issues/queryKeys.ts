export const issuesKeys = {
  recent: (projectId: string, limit: number, environment: string | null = null) =>
    ["issues", "recent", projectId, limit, environment] as const,
  detail: (issueId: string) => ["issues", "detail", issueId] as const,
};
