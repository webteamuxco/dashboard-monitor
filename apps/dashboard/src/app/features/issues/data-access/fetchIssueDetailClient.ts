import type { IssueDetailView } from "../domain/IssueDetailView";

export async function fetchIssueDetailClient(
  documentId: string,
  issueId: string,
  environment: string | null = null,
): Promise<IssueDetailView> {
  const params = new URLSearchParams({ documentId });
  if (environment) params.set("environment", environment);
  const res = await fetch(
    `/api/issues/${encodeURIComponent(issueId)}?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: IssueDetailView };
  return payload.data;
}
