"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMonitorsClient } from "../data-access/fetchMonitorsClient";
import { monitorKeys } from "../queryKeys";

export function useMonitors(intervalMs = 0) {
  return useQuery({
    queryKey: monitorKeys.list(),
    queryFn: fetchMonitorsClient,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
