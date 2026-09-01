export const configKeys = {
  projects: () => ["config", "projects"] as const,
  pannels: () => ["pannels", "projects"] as const,
  project: (documentId: string) => ["config", "project", documentId] as const,
};
