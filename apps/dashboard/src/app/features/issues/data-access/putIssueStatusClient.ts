import type { IssueComment } from "@/lib/errorMonitor/domain/IssueComment";
import { StatusDTO } from "../domain/statusDto";
import { Issue } from "@/lib/errorMonitor/domain/Issue";

export async function putIssueStatusClient(
  blockId: string,
  issueId: string,
  dto: StatusDTO,
): Promise<Issue> {
  const res = await fetch(
    `/api/blocks/${encodeURIComponent(blockId)}/issues/${encodeURIComponent(issueId)}/status`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: Issue };
  return payload.data;
}
