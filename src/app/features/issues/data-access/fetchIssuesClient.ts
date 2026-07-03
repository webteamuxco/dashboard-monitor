import type { IssueRow } from "../domain/IssueRow";

export async function fetchIssuesClient(
  projectId: string,
  limit: number,
  environment: string | null = null,
): Promise<IssueRow[]> {
  const params = new URLSearchParams({ projectId, limit: String(limit) });
  if (environment) params.set("environment", environment);
  const res = await fetch(`/api/issues?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: IssueRow[] };
  return payload.data;
}
