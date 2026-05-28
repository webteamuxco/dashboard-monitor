"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssueDetailClient } from "../data-access/fetchIssueDetailClient";
import { issuesKeys } from "../queryKeys";

export function useIssueDetail(issueId: string | null) {
  return useQuery({
    queryKey: issueId ? issuesKeys.detail(issueId) : ["issues", "detail", "none"],
    queryFn: () => fetchIssueDetailClient(issueId as string),
    enabled: !!issueId,
    staleTime: 30_000,
  });
}
