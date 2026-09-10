"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { dashboardKpiKeys } from "../queryKeys";
import { fetchKpiMeasureClient } from "../data-access/fetchKpiMeasureClient";
import { KpiMeasure } from "../domain/KpiMeasure";

export function useKpi(
  kpiId: string,
  windowMinutes: number | null,
  environment: string | null,
  intervalMs: number,
): UseQueryResult<KpiMeasure, Error> {
  return useQuery({
    queryKey: dashboardKpiKeys.measure(kpiId, windowMinutes, environment),
    queryFn: () => fetchKpiMeasureClient(kpiId, windowMinutes, environment),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
