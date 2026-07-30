export const issuesKeys = {
  recent: (documentId: string, limit: number, environment: string | null = null) =>
    ["issues", "recent", documentId, limit, environment] as const,
  detail: (issueId: string) => ["issues", "detail", issueId] as const,
};
