"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssueDetailClient } from "../data-access/fetchIssueDetailClient";
import { issuesKeys } from "../queryKeys";

export function useIssueDetail(
  documentId: string,
  issueId: string | null,
  environment: string | null = null,
) {
  return useQuery({
    queryKey: issueId
      ? issuesKeys.detail(issueId, environment)
      : ["issues", "detail", "none", environment],
    queryFn: () =>
      fetchIssueDetailClient(documentId, issueId as string, environment),
    enabled: !!issueId,
    staleTime: 30_000,
  });
}
