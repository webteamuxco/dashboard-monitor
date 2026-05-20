export const issuesKeys = {
  recent: (projectId: string, limit: number) =>
    ["issues", "recent", projectId, limit] as const,
};
