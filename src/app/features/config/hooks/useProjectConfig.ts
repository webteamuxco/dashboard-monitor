"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProjectConfigClient } from "../data-access/fetchProjectConfigClient";
import { configKeys } from "../queryKeys";

export function useProjectConfig(documentId: string) {
  return useQuery({
    queryKey: configKeys.project(documentId),
    queryFn: () => fetchProjectConfigClient(documentId),
    staleTime: 5 * 60_000,
    enabled: Boolean(documentId),
  });
}
