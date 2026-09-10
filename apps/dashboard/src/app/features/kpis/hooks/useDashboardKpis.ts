"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { fetchDashboardKpisClient } from "../data-access/fetchDashboardKpisClient";
import { dashboardKpiKeys } from "../queryKeys";
import { DashboardKpi } from "@/lib/config/domain/DashboardKpi";

export function useDashboardKpis(
  panelSlug: string | null,
  intervalMs: number,
): UseQueryResult<DashboardKpi[], Error> {
  return useQuery({
    queryKey: dashboardKpiKeys.config(panelSlug),
    queryFn: () => fetchDashboardKpisClient(panelSlug ?? ""),
    enabled: !!panelSlug,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
