"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssuesClient } from "../data-access/fetchIssuesClient";
import { issuesKeys } from "../queryKeys";

export function useIssues(
  projectId: string,
  limit: number,
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: issuesKeys.recent(projectId, limit, environment),
    queryFn: () => fetchIssuesClient(projectId, limit, environment),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
