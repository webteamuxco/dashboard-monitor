import { LEVEL_ROW_CLASS, LEVEL_VARIANT } from "@/app/features/utils/accent";
import { cn } from "@/lib/utils";
import { BlockListEntry } from "../../../domain/BlockMeasure";
import { Badge } from "@/components/ui/badge";


export function BlockLine({
  entry,
  onSelect,
}: {
  entry: BlockListEntry;
  onSelect?: () => void;
}) {
  const content = (
    <>
      <div className="mb-1 truncate font-mono text-[0.71875rem] text-foreground">
        {entry.title}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={LEVEL_VARIANT[entry.level]}>{entry.level}</Badge>
        {entry.subtitle && <Badge variant="muted">{entry.subtitle}</Badge>}
        {entry.count !== null && (
          <span className="font-mono text-[0.625rem] text-muted-foreground/60">
            ×{entry.count}
          </span>
        )}
        <span
          className="font-mono text-[0.625rem] text-muted-foreground/60"
          title={entry.timestampIso}
        >
          {entry.timestampLabel}
        </span>
      </div>
    </>
  );

  return (
    <li
      className={cn(
        "border-b border-border last:border-b-0",
        LEVEL_ROW_CLASS[entry.level],
        onSelect ? "hover:bg-muted/40" : "",
      )}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="block w-full cursor-pointer px-3.5 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {content}
        </button>
      ) : (
        <div className="px-3.5 py-2.5">{content}</div>
      )}
    </li>
  );
}
