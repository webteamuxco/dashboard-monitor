import type { ErrorRatePoint } from "../domain/ErrorRatePoint";

export async function fetchErrorRateClient(projectId: string): Promise<ErrorRatePoint[]> {
  const params = new URLSearchParams({ projectId });
  const res = await fetch(`/api/error-rate?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: ErrorRatePoint[] };
  return payload.data;
}
