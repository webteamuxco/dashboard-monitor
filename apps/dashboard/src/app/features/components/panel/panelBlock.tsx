"use client";

import { cn } from "@/lib/utils";
import { useDashboardBlock } from "../../blocks/hooks/useDashboardBlock";
import { BlockCard } from "../../blocks/ui/BlockCard";
import { TransitionStates } from "../states"


interface PanelBlockProps {
      panelSlug: string | null;
      limit: number;
      intervalMs: number;
}

export function PanelBlock ({
    panelSlug,
    limit,
    intervalMs,
}: PanelBlockProps) {

  // BLOCKS
  const { data, isPending, isFetching, isError, error } =
    useDashboardBlock(
      panelSlug,
      intervalMs,
    );

  const showBackgroundDot = isFetching && !isPending;

  if (!panelSlug) { return null }

  const blocks = data ?? [];
  const columns = [
    { side: "even", blocks: blocks.filter((_) => _.order % 2 === 0) },
    { side: "odd", blocks: blocks.filter((_) => _.order % 2 === 1) },
  ].filter((column) => column.blocks.length > 0);

    return (
        <div className="PanelBlock flex min-h-0 flex-1 flex-col gap-2.5">
            <TransitionStates
                showBackgroundDot={showBackgroundDot}
                isError={isError}
                error={error}
            ></TransitionStates>

          <div
            className={cn(
              "BlockColumns grid min-h-0 flex-1 gap-2.5",
              columns.length > 1 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
              {columns.map((column) => (
                <div
                  key={column.side}
                  className="BlockColumn grid min-h-0 auto-rows-fr gap-2.5"
                >
                    {column.blocks.map((block) => (
                      <BlockCard
                        key={block.slug}
                        dashboardBlock={block}
                        limit={limit}
                        intervalMs={intervalMs}
                      />
                    ))}
                </div>
              ))}
          </div>

        </div>
    )
}
