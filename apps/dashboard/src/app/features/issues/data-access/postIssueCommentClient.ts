import type { IssueComment } from "@/lib/errorMonitor/domain/IssueComment";
import type { CommentDTO } from "../domain/commentsDto";

export async function postIssueCommentClient(
  blockId: string,
  issueId: string,
  dto: CommentDTO,
): Promise<IssueComment> {
  const res = await fetch(
    `/api/blocks/${encodeURIComponent(blockId)}/issues/${encodeURIComponent(issueId)}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: IssueComment };
  return payload.data;
}
