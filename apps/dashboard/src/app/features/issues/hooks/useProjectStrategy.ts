"use client";

import { useQuery } from "@tanstack/react-query";

import { issuesKeys } from "../queryKeys";
import { fetchProjectStrategy } from "../data-access/fetchProjectStrategy";

export function useProjectStrategy(
  documentId: string,
  selectedPanel: string | null,
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: issuesKeys.isConfig(documentId, environment, selectedPanel),

    queryFn: () => fetchProjectStrategy(documentId, selectedPanel!),

    enabled: !!documentId && !!selectedPanel,

    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
