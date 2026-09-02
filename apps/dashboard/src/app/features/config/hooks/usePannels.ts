"use client";

import { useQuery } from "@tanstack/react-query";
import { configKeys } from "../queryKeys";
import { fetchProjectPanels } from "../data-access/fetchProjectPannels";

export function usePanels(documentId: string) {
  return useQuery({
    queryKey: configKeys.pannels(documentId),
    queryFn: () => fetchProjectPanels(documentId),
    staleTime: 5 * 60_000,
    enabled: Boolean(documentId),
  });
}
