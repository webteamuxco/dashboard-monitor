export const reservationsKeys = {
  series: (documentId: string, windowMinutes: number, environment: string | null = null) =>
    ["reservations", "series", documentId, windowMinutes, environment] as const,
};
