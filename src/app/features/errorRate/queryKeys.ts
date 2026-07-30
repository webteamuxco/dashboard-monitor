export const errorRateKeys = {
  series: (documentId: string, environment: string | null = null) =>
    ["errorRate", "series", documentId, environment] as const,
};
