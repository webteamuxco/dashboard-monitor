"use client";

import { cn } from "@/lib/utils";
import { MonitorStrategyTag } from "@/lib/config/domain/MonitorStrategy";

interface BlockTagSelectorProps {
  tags: MonitorStrategyTag[];
  selectedTagId: string | null;
  onSelect: (tagId: string) => void;
}

export function BlockTagSelector({
  tags,
  selectedTagId,
  onSelect,
}: BlockTagSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Tag affiché"
      className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5 font-mono text-[0.625rem]"
    >
      {tags.map((tag) => {
        const active = tag.id === selectedTagId;
        return (
          <button
            key={tag.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={tag.description ?? tag.value}
            onClick={() => onSelect(tag.id)}
            className={cn(
              "rounded px-2 py-0.5 transition-colors cursor-pointer",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
