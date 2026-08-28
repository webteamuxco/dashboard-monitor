"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReservationsClient } from "../data-access/fetchReservationsClient";
import { reservationsKeys } from "../queryKeys";

export function useReservations(
  documentId: string,
  windowMinutes: number,
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: reservationsKeys.series(documentId, windowMinutes, environment),
    queryFn: () => fetchReservationsClient(documentId, windowMinutes, environment),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
