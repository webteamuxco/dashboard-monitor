"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssuesClient } from "../data-access/fetchIssuesClient";
import { issuesKeys } from "../queryKeys";

export function useIssues(projectId: string, limit: number, intervalMs: number) {
  return useQuery({
    queryKey: issuesKeys.recent(projectId, limit),
    queryFn: () => fetchIssuesClient(projectId, limit),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
