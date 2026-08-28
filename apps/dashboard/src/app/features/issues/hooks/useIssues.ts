"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssuesClient } from "../data-access/fetchIssuesClient";
import { issuesKeys } from "../queryKeys";

export function useIssues(
  documentId: string,
  limit: number,
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: issuesKeys.recent(documentId, limit, environment),
    queryFn: () => fetchIssuesClient(documentId, limit, environment),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
