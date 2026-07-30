export const visitorsKeys = {
  timeline: (documentId: string, windowMinutes: number) =>
    ["visitors", "timeline", documentId, windowMinutes] as const,
};
