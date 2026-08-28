import type { ProjectSummary } from "@/lib/config/domain/ProjectSummary";

export async function fetchProjectsClient(): Promise<ProjectSummary[]> {
  const res = await fetch("/api/config/projects", { cache: "no-store" });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: ProjectSummary[] };
  return payload.data;
}
