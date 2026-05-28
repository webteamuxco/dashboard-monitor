"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVisitorsTimelineClient } from "../data-access/fetchVisitorsTimelineClient";
import { visitorsKeys } from "../queryKeys";

export function useVisitorsTimeline(
  projectId: string,
  windowMinutes: number,
  intervalMs: number,
) {
  return useQuery({
    queryKey: visitorsKeys.timeline(projectId, windowMinutes),
    queryFn: () => fetchVisitorsTimelineClient(projectId, windowMinutes),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
    staleTime: intervalMs > 0 ? intervalMs : 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
