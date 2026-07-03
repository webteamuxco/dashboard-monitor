export const reservationsKeys = {
  series: (projectId: string, windowMinutes: number, environment: string | null = null) =>
    ["reservations", "series", projectId, windowMinutes, environment] as const,
};
