export const errorRateKeys = {
  series: (projectId: string, environment: string | null = null) =>
    ["errorRate", "series", projectId, environment] as const,
};
