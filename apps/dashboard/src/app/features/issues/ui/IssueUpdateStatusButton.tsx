"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateIssueStatus } from "../hooks/useUpdateIssueStatus";
import { cn } from "@/lib/utils";

const RESOLVED_STATUS = "resolved";
const UNRESOLVED_STATUS = "unresolved";

export function IssueUpdateStatusButton({
  className,
  blockId,
  issueId,
  isResolved,
}: {
  className: string;
  blockId: string;
  issueId: string;
  isResolved: boolean;
}) {
  const { mutate, isPending, isError, error } = useUpdateIssueStatus(blockId, issueId);

  const nextStatus = isResolved ? UNRESOLVED_STATUS : RESOLVED_STATUS;
  const label = isResolved ? "Marquer comme non résolu" : "Marquer comme résolu";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer text-xs"
        disabled={isPending}
        onClick={() => mutate(nextStatus)}
      >
        {isResolved ? <RotateCcw /> : <CheckCircle2 />}
        {isPending ? "Enregistrement…" : label}
      </Button>

      {isError && (
        <p className="font-mono text-[0.625rem] text-level-fatal">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      )}
    </div>
  );
}
