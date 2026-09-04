"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { configKeys } from "../queryKeys";
import { fetchProjectPanels } from "../data-access/fetchProjectPannels";
import {
  SHOW_DEV_PANEL_QUERY_PARAM,
  readDevelopmentPanelParam,
} from "../../utils/queryFilters";

export function usePanels(documentId: string) {
  const searchParams = useSearchParams();
  const showDevelopmentPanel = readDevelopmentPanelParam(
    searchParams.get(SHOW_DEV_PANEL_QUERY_PARAM) ?? undefined,
  );

  return useQuery({
    queryKey: configKeys.pannels(documentId, showDevelopmentPanel),
    queryFn: () => fetchProjectPanels(documentId, showDevelopmentPanel),
    staleTime: 5 * 60_000,
    enabled: Boolean(documentId),
  });
}
