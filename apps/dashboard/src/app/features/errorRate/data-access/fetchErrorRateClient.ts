import type { ErrorRateSeries } from "../domain/ErrorRatePoint";

export async function fetchErrorRateClient(
  documentId: string,
  environment: string | null = null,
): Promise<ErrorRateSeries> {

  const params = new URLSearchParams({ documentId });
  
  if (environment) params.set("environment", environment);
  
  const res = await fetch(`/api/error-rate?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: ErrorRateSeries };
  return payload.data;
}
