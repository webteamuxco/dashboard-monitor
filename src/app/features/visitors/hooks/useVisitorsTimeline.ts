"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVisitorsTimelineClient } from "../data-access/fetchVisitorsTimelineClient";
import { visitorsKeys } from "../queryKeys";

export function useVisitorsTimeline(
  documentId: string,
  windowMinutes: number,
  intervalMs: number,
) {
  return useQuery({
    queryKey: visitorsKeys.timeline(documentId, windowMinutes),
    queryFn: () => fetchVisitorsTimelineClient(documentId, windowMinutes),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
    staleTime: intervalMs > 0 ? intervalMs : 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
