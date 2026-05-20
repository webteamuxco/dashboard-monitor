"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProjectsClient } from "../data-access/fetchProjectsClient";
import { configKeys } from "../queryKeys";

export function useProjects() {
  return useQuery({
    queryKey: configKeys.projects(),
    queryFn: fetchProjectsClient,
    staleTime: 5 * 60_000,
  });
}
