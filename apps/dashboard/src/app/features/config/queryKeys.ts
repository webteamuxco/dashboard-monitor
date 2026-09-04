export const configKeys = {
  projects: () => ["config", "projects"] as const,
  pannels: (documentId: string, showDevelopmentPanel: boolean) => ["config", "pannels", documentId, showDevelopmentPanel] as const,
  project: (documentId: string) => ["config", "project", documentId] as const,
};
