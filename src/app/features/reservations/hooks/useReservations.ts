"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReservationsClient } from "../data-access/fetchReservationsClient";
import { reservationsKeys } from "../queryKeys";

export function useReservations(projectId: string, windowMinutes: number, intervalMs: number) {
  return useQuery({
    queryKey: reservationsKeys.series(projectId, windowMinutes),
    queryFn: () => fetchReservationsClient(projectId, windowMinutes),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
