import { KpiMeasure } from "../domain/KpiMeasure";

export async function fetchKpiMeasureClient(
  kpiId: string,
  windowMinutes: number | null,
  environment: string | null,
): Promise<KpiMeasure> {
  const params = new URLSearchParams();
  if (windowMinutes !== null) {
    params.set("windowMinutes", String(windowMinutes));
  }
  if (environment) {
    params.set("environment", environment);
  }

  const query = params.toString();
  const res = await fetch(`/api/kpis/${kpiId}${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: KpiMeasure };

  return payload.data;
}
