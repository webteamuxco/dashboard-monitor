"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateIssueStatus } from "../../../issues/hooks/useUpdateIssueStatus";
import { cn } from "@/lib/utils";

const RESOLVED_STATUS = "resolved";
const UNRESOLVED_STATUS = "unresolved";

export function UpdateStatusButton({
  className,
  blockId,
  issueId,
  isResolved,
  revealOnHover = false,
}: {
  className?: string;
  blockId: string;
  issueId: string;
  isResolved: boolean;
  revealOnHover?: boolean;
}) {
  const { mutate, isPending, isError, error } = useUpdateIssueStatus(blockId, issueId);

  const nextStatus = isResolved ? UNRESOLVED_STATUS : RESOLVED_STATUS;
  const label = isResolved ? "Marquer comme non résolu" : "Marquer comme résolu";

  // A save in flight and a failed one must survive the pointer leaving the row,
  // otherwise the error message disappears before it can be read.
  const hidden = revealOnHover && !isPending && !isError;

  return (
    <div
      className={cn(
        "flex items-center gap-2 transition-opacity",
        hidden
          ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          : "opacity-100",
        className,
      )}
    >
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
