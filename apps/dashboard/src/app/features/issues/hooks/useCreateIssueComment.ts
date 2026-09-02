"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postIssueCommentClient } from "../data-access/postIssueCommentClient";
import { issuesKeys } from "../queryKeys";

export function useCreateIssueComment(documentId: string, issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      postIssueCommentClient(documentId, issueId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuesKeys.detail(issueId) });
    },
  });
}
