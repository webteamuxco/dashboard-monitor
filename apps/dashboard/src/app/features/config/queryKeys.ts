export const configKeys = {
  projects: () => ["config", "projects"] as const,
  pannels: (documentId: string) => ["config", "pannels", documentId] as const,
  project: (documentId: string) => ["config", "project", documentId] as const,
};
