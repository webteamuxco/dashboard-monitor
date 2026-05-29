"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMonitorBySlugClient } from "../data-access/fetchMonitorBySlugClient";
import { monitorKeys } from "../queryKeys";

export function useMonitor(slug: string | null, intervalMs = 0) {
  return useQuery({
    queryKey: slug ? monitorKeys.bySlug(slug) : monitorKeys.bySlug("__none__"),
    queryFn: () => fetchMonitorBySlugClient(slug as string),
    enabled: !!slug,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
