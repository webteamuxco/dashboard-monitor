"use client";

import { cn } from "@/lib/utils";
import { CircleCheck } from "lucide-react";

interface ShowResolvedToggleProps {
  showResolved: boolean;
  onToggle: (showResolved: boolean) => void;
}

export function ShowResolvedToggle({
  showResolved,
  onToggle,
}: ShowResolvedToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={showResolved}
      aria-label="Afficher les issues résolues"
      title={
        showResolved
          ? "Masquer les issues résolues"
          : "Afficher les issues résolues"
      }
      onClick={() => onToggle(!showResolved)}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[0.625rem] transition-colors",
        showResolved
          ? "text-foreground shadow-sm bg-green-800"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      <CircleCheck className="h-3 w-3" />
      résolues
    </button>
  );
}
