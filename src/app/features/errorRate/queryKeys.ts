export const errorRateKeys = {
  series: (projectId: string) => ["errorRate", "series", projectId] as const,
};
