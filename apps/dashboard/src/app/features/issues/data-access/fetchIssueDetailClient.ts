import type { IssueDetailView } from "../domain/IssueDetailView";

export async function fetchIssueDetailClient(
  issueId: string,
): Promise<IssueDetailView> {
  const res = await fetch(`/api/issues/${encodeURIComponent(issueId)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: IssueDetailView };
  return payload.data;
}
