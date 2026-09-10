import { DashboardKpi } from "@/lib/config/domain/DashboardKpi";

export async function fetchDashboardKpisClient(
  panelSlug: string,
): Promise<DashboardKpi[]> {
  const params = new URLSearchParams({ panelSlug });

  const res = await fetch(`/api/config/dashboard-kpis?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: DashboardKpi[] };

  return payload.data;
}
