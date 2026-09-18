"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { dashboardBlockKeys } from "../queryKeys";
import { fetchBlockMeasureClient } from "../data-access/fetchBlockMeasureClient";
import { BlockMeasure } from "../../../../lib/shared/domain/BlockMeasure";

export function useBlock(
  blockId: string,
  windowMinutes: number | null,
  environment: string | null,
  limit: number | null,
  tagId: string | null,
  intervalMs: number,
  showResolved = false,
): UseQueryResult<BlockMeasure, Error> {
  return useQuery({
    queryKey: dashboardBlockKeys.measure(
      blockId,
      windowMinutes,
      environment,
      limit,
      tagId,
      showResolved,
    ),
    queryFn: () =>
      fetchBlockMeasureClient(
        blockId,
        windowMinutes,
        environment,
        limit,
        tagId,
        showResolved,
      ),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  });
}
