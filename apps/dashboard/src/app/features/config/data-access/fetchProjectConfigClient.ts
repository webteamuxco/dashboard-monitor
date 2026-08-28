import type { Project } from "@/lib/config/domain/Project";

export async function fetchProjectConfigClient(
  documentId: string,
): Promise<Project | null> {
  const res = await fetch(`/api/config/projects/${documentId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: Project | null };
  return payload.data;
}
