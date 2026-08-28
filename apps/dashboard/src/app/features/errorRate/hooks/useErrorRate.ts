"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchErrorRateClient } from "../data-access/fetchErrorRateClient";
import { errorRateKeys } from "../queryKeys";

export function useErrorRate(
  documentId: string,
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: errorRateKeys.series(documentId, environment),
    queryFn: () => fetchErrorRateClient(documentId, environment),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
