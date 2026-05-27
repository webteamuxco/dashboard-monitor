export const visitorsKeys = {
  timeline: (projectId: string, windowMinutes: number) =>
    ["visitors", "timeline", projectId, windowMinutes] as const,
};
