export const issuesKeys = {
  detail: (issueId: string) => ["issues", "detail", issueId] as const,
};
