"use client";

import { useQuery } from "@tanstack/react-query";
import { issuesKeys } from "../queryKeys";
import { fetchProjectStrategy } from "../data-access/fetchProjectStrategy";

export function useProjectStrategy(
  documentId: string,
  environment: string | null,
  intervalMs: number,

) {
  return useQuery({
    queryKey: issuesKeys.isConfig(documentId, environment),
    queryFn: () => fetchProjectStrategy(documentId),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
