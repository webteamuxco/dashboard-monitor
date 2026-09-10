"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { DashboardBlock } from "@/lib/config/domain/DashboardBlock";
import { dashboardBlockKeys } from "../queryKeys";
import { fetchDashboardBlockClient } from "../data-access/fetchDashboardBlockClient";

export function useDashboardBlock(
  panelSlug: string | null,
  intervalMs: number,
): UseQueryResult<DashboardBlock[], Error> {
  return useQuery({
    queryKey: dashboardBlockKeys.config(panelSlug),
    queryFn: () => fetchDashboardBlockClient(panelSlug ?? ""),
    enabled: !!panelSlug,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
