"use client"

import { Card } from "@/components/ui/card";

import { useState } from "react";
import {
  DashboardBlock,
  isListBlock,
  isWindowedBlock,
  logMonitorTags,
} from "@/lib/config/domain/DashboardBlock";
import { LEVELS } from "@/lib/config/domain/Level";
import { cn } from "@/lib/utils";
import {
  isDashboardInteractive,
  useDashboardWindow,
} from "../../dashboard/state/useDashboardWindow";
import { useEnvironment } from "../../dashboard/state/useEnvironment";
import { useBlock } from "../hooks/useBlock";
import { ACCENT_BAR} from "../../utils/accent";
import { BlockCardHeader } from "./card/BlockCardHeader";
import { BlockCardContent } from "./card/BlockCardContent";



interface BlockProps {
  dashboardBlock: DashboardBlock;
  limit: number;
  intervalMs: number;
}

export function BlockCard({ dashboardBlock, limit, intervalMs }: BlockProps) {

  // Selecting `null` for an unwindowed block rather than filtering afterwards:
  // the store then has nothing to notify this card about, so changing preset
  // neither re-renders it nor invalidates its query key.
  const windowMinutes = useDashboardWindow((s) =>
    isWindowedBlock(dashboardBlock.type) ? s.windowMinutes : null,
  );
  const environment = useEnvironment((s) => s.environment);
  const rows = isListBlock(dashboardBlock.type) ? limit : null;

  // The provider ANDs the terms of one log query, so several tags are read one
  // at a time. Deriving the active id rather than storing it keeps a selection
  // valid when an admin drops the tag it pointed at.
  const tags = logMonitorTags(dashboardBlock);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const activeTagId = tags.some((tag) => tag.id === selectedTagId)
    ? selectedTagId
    : tags[0]?.id ?? null;
  const activeTag = tags.find((tag) => tag.id === activeTagId);
  const selectableTags = isDashboardInteractive() ? tags : [];

  const { data, isPending, isFetching, isError, error } = useBlock(
    dashboardBlock.id,
    windowMinutes,
    environment,
    rows,
    activeTagId,
    intervalMs,
  );

  const showBackgroundDot = isFetching && !isPending;
  const tagCaption = activeTag?.description ?? null;
  // `level` is optional in Strapi admin: a block published without one still
  // has to pick a colour, and every accent map is keyed on a real level.
  const level = dashboardBlock.level ?? LEVELS.INFO;

  return (
    <Card className="relative flex h-full min-h-0 w-full flex-col">
      <div
        className={cn("absolute inset-x-0 top-0 h-0.5", ACCENT_BAR[level])}
        aria-hidden
      />

      <BlockCardHeader
        dashboardBlock={dashboardBlock}
        data={data}
        level={level}
        showBackgroundDot={showBackgroundDot}
        tags={selectableTags}
        selectedTagId={activeTagId}
        onSelectTag={setSelectedTagId}
      ></BlockCardHeader>

      <BlockCardContent
        dashboardBlock={dashboardBlock}
        data={data}
        level={level}
        isError={isError}
        isPending={isPending}
        error={error}
      ></BlockCardContent>

      {(dashboardBlock.description || tagCaption) && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2 font-mono text-[0.625rem] text-muted-foreground/60">
          <span>{dashboardBlock.description}</span>
          {tagCaption && <span className="truncate text-right">{tagCaption}</span>}
        </div>
      )}
    </Card>
  );
}
