import { DashboardPanel } from "@/lib/config/domain/DashboardPanels";
import { SHOW_DEV_PANEL_QUERY_PARAM } from "@/app/features/utils/queryFilters";

export async function fetchProjectPanels(
  documentId: string,
  showDevelopmentPanel: boolean = false,
): Promise<DashboardPanel[]> {
  const params = new URLSearchParams({
    [SHOW_DEV_PANEL_QUERY_PARAM]: String(showDevelopmentPanel),
  });

  const res = await fetch(
    `/api/config/projects/${documentId}/panels?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: DashboardPanel[] };
  return payload.data;
}
