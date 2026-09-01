import { Strategy } from "@/lib/config/domain/Strategy";

export async function fetchProjectStrategy(
  documentId: string,
  selectedPanel: string,
): Promise<Strategy[]> {

  const params = new URLSearchParams({ selectedPanel });
  
  const res = await fetch(`/api/config/projects/${documentId}/strategies?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: Strategy[] };

  return payload.data;
}
