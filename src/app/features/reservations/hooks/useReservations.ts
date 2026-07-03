"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReservationsClient } from "../data-access/fetchReservationsClient";
import { reservationsKeys } from "../queryKeys";

export function useReservations(
  projectId: string,
  windowMinutes: number,
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: reservationsKeys.series(projectId, windowMinutes, environment),
    queryFn: () => fetchReservationsClient(projectId, windowMinutes, environment),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
