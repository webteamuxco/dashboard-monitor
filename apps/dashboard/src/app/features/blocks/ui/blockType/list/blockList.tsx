"use client";

import { useState } from "react";
import { EmptyState } from "@/app/features/dashboard/ui/EmptyState";
import { isDashboardInteractive } from "@/app/features/dashboard/state/useDashboardWindow";
import { IssueDetailSheet } from "@/app/features/issues/ui/IssueDetailSheet";
import { BlockLine } from "./blockLine";
import { ListBlockMeasure } from "../../../domain/BlockMeasure";

export function BlockList({
  blockId,
  measure,
}: {
  blockId: string;
  measure: ListBlockMeasure;
}) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const canOpenDetail = measure.hasDetail && isDashboardInteractive();

  if (measure.entries.length === 0) {
    return <EmptyState>Aucune donnée</EmptyState>;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ul>
        {measure.entries.map((entry) => (
          <BlockLine
            key={entry.id}
            entry={entry}
            onSelect={
              canOpenDetail ? () => setSelectedEntryId(entry.id) : undefined
            }
          />
        ))}
      </ul>

      {canOpenDetail && (
        <IssueDetailSheet
          blockId={blockId}
          issueId={selectedEntryId}
          onOpenChange={(open) => {
            if (!open) setSelectedEntryId(null);
          }}
        />
      )}
    </div>
  );
}
