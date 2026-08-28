import type { VisitorPoint } from "../domain/VisitorPoint";

export async function fetchVisitorsTimelineClient(
  documentId: string,
  windowMinutes: number,
): Promise<VisitorPoint[]> {
  const params = new URLSearchParams({
    documentId,
    windowMinutes: String(windowMinutes),
  });
  const res = await fetch(`/api/visitors/timeline?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: VisitorPoint[] };
  return payload.data;
}
