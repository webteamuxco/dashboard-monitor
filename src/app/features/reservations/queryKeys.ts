export const reservationsKeys = {
  series: (projectId: string, windowMinutes: number) =>
    ["reservations", "series", projectId, windowMinutes] as const,
};
