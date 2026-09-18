export const dashboardBlockKeys = {
  config: (panelSlug: string | null) =>
    ["dashboardBlocks", "config", panelSlug] as const,
  measures: (blockId: string) =>
    ["dashboardBlocks", "measure", blockId] as const,
  measure: (
    blockId: string,
    windowMinutes: number | null,
    environment: string | null = null,
    limit: number | null = null,
    tagId: string | null = null,
    showResolved = false,
  ) =>
    [
      ...dashboardBlockKeys.measures(blockId),
      windowMinutes,
      environment,
      limit,
      tagId,
      showResolved,
    ] as const,
};
