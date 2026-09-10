import { BlockMeasure } from "../domain/BlockMeasure";

export async function fetchBlockMeasureClient(
  blockId: string,
  windowMinutes: number | null,
  environment: string | null,
  limit: number | null,
  tagId: string | null = null,
): Promise<BlockMeasure> {
  const params = new URLSearchParams();
  if (windowMinutes !== null) {
    params.set("windowMinutes", String(windowMinutes));
  }
  if (limit !== null) {
    params.set("limit", String(limit));
  }
  if (environment) {
    params.set("environment", environment);
  }
  if (tagId) {
    params.set("tag", tagId);
  }

  const query = params.toString();
  const res = await fetch(`/api/blocks/${blockId}${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: BlockMeasure };

  return payload.data;
}
