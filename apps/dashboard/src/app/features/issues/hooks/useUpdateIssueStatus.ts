"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesKeys } from "../queryKeys";
import { putIssueStatusClient } from "../data-access/putIssueStatusClient";

export function useUpdateIssueStatus(blockId: string, issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: string) =>
      putIssueStatusClient(blockId, issueId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuesKeys.detail(issueId) });
    },
  });
}
