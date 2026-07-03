"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchErrorRateClient } from "../data-access/fetchErrorRateClient";
import { errorRateKeys } from "../queryKeys";

export function useErrorRate(
  projectId: string,
  environment: string | null,
  intervalMs: number,
) {
  return useQuery({
    queryKey: errorRateKeys.series(projectId, environment),
    queryFn: () => fetchErrorRateClient(projectId, environment),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
