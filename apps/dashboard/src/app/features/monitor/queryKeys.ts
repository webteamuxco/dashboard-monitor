export const monitorKeys = {
  all: ["monitor"] as const,
  list: () => ["monitor", "list"] as const,
  bySlug: (slug: string) => ["monitor", "bySlug", slug] as const,
};
