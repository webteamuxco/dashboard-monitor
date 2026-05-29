import type { Monitor } from "../domain/Monitor";

export async function fetchMonitorBySlugClient(slug: string): Promise<Monitor> {
  const res = await fetch(`/api/monitor/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error ?? `Request failed with status ${res.status}`,
    );
  }

  const payload = (await res.json()) as { data: Monitor };
  return payload.data;
}
