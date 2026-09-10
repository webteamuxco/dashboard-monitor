import { DashboardBlock } from "@/lib/config/domain/DashboardBlock";

export async function fetchDashboardBlockClient(
  panelSlug: string,
): Promise<DashboardBlock[]> {
  const params = new URLSearchParams({ panelSlug });

  const res = await fetch(`/api/config/dashboard-blocks?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: DashboardBlock[] };

  return payload.data;
}
