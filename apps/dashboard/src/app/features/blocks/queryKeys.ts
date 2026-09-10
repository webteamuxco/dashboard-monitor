export const dashboardBlockKeys = {
  config: (panelSlug: string | null) =>
    ["dashboardBlocks", "config", panelSlug] as const,
  measure: (
    blockId: string,
    windowMinutes: number | null,
    environment: string | null = null,
    limit: number | null = null,
    tagId: string | null = null,
  ) =>
    [
      "dashboardBlocks",
      "measure",
      blockId,
      windowMinutes,
      environment,
      limit,
      tagId,
    ] as const,
};
