export const issuesKeys = {
  recent: (projectId: string, limit: number) =>
    ["issues", "recent", projectId, limit] as const,
  detail: (issueId: string) => ["issues", "detail", issueId] as const,
};
