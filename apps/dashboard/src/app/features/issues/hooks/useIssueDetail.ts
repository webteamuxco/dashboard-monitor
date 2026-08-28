"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssueDetailClient } from "../data-access/fetchIssueDetailClient";
import { issuesKeys } from "../queryKeys";

export function useIssueDetail(documentId: string, issueId: string | null) {
  return useQuery({
    queryKey: issueId ? issuesKeys.detail(issueId) : ["issues", "detail", "none"],
    queryFn: () => fetchIssueDetailClient(documentId, issueId as string),
    enabled: !!issueId,
    staleTime: 30_000,
  });
}
