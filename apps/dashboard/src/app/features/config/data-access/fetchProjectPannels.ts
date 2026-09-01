import { DashboardPanel } from "@/lib/config/domain/DashboardPanels";

export async function fetchProjectPanels( documentId: string): Promise<DashboardPanel[]> {
  const res = await fetch(`/api/config/projects/${documentId}/panels`, { cache: "no-store" });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: DashboardPanel[] };
  return payload.data;
}
