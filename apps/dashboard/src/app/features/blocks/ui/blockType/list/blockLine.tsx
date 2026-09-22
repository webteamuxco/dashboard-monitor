import { LEVEL_ROW_CLASS, LEVEL_VARIANT } from "@/app/features/utils/accent";
import { cn } from "@/lib/utils";
import { BlockListEntry } from "../../../../../../lib/shared/domain/BlockMeasure";
import { Badge } from "@/components/ui/badge";
import { UpdateStatusButton } from "../../card/UpdateStatusButton";

export function BlockLine({
  blockId,
  entry,
  showUpdateStatusButton = false,
  onSelect,
}: {
  blockId: string;
  entry: BlockListEntry;
  showUpdateStatusButton: boolean,
  onSelect?: () => void;
}) {
  return (
    <li
      className={cn(
        "group relative border-b border-border transition-colors last:border-b-0",
        LEVEL_ROW_CLASS[entry.level],
        onSelect ? "hover:bg-muted/40" : "",
        entry.isResolved ? "bg-muted/80 opacity-50" : "",
      )}
    >
      {/* Stretched under the row rather than wrapping it: the status button is
          itself a button, and nesting the two would be invalid markup whose
          click bubbles into the detail sheet. */}
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          aria-label={entry.title}
          className="absolute inset-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      )}

      <div
        className={cn(
          "relative px-3.5 py-2.5",
          onSelect ? "pointer-events-none" : "",
        )}
      >
        <div className="mb-1 truncate font-mono text-[0.71875rem] text-foreground">
          {entry.title}
        </div>
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Badge variant={LEVEL_VARIANT[entry.level]}>{entry.level}</Badge>
            {entry.subtitle && <Badge variant="muted">{entry.subtitle}</Badge>}
            {entry.count !== null && (
              <span className="font-mono text-[0.625rem] text-muted-foreground/60">
                ×{entry.count}
              </span>
            )}
            <span
              className="pointer-events-auto font-mono text-[0.625rem] text-muted-foreground/60"
              title={entry.timestampIso}
            >
              {entry.timestampLabel}
            </span>
          </div>
          {showUpdateStatusButton && 
            <UpdateStatusButton
              blockId={blockId}
              issueId={entry.id}
              isResolved={entry.isResolved ?? false}
              revealOnHover
              className="pointer-events-auto"
            />
          }
        </div>
      </div>
    </li>
  );
}
