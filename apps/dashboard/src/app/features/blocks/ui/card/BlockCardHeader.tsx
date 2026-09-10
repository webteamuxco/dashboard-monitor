import { ACCENT_VALUE } from "@/app/features/utils/accent";
import { getLucideIcon } from "@/app/features/utils/lucidIcon";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBlock } from "@/lib/config/domain/DashboardBlock";
import { Level } from "@/lib/config/domain/Level";
import { cn } from "@/lib/utils";
import { createElement } from "react";
import { BlockMeasure } from "../../domain/BlockMeasure";
import { MonitorStrategyTag } from "@/lib/config/domain/MonitorStrategy";
import { BlockTagSelector } from "./BlockTagSelector";
import { formatWindowLabel } from "@/app/features/dashboard/state/windowPresets";

type BlockCardHeaderProps = {
    dashboardBlock: DashboardBlock,
    data?: BlockMeasure,
    level: Level,
    showBackgroundDot: boolean,
    tags: MonitorStrategyTag[],
    selectedTagId: string | null,
    onSelectTag: (tagId: string) => void
}

export function BlockCardHeader(
    {
        dashboardBlock,
        data,
        level,
        showBackgroundDot,
        tags,
        selectedTagId,
        onSelectTag
    }: BlockCardHeaderProps
) {
    return (
        <CardHeader>
            <CardTitle>
            {createElement(getLucideIcon(dashboardBlock.icon), {
                className: "h-3.5 w-3.5 text-muted-foreground",
            })}
            {dashboardBlock.title}
            {data?.type === "list" && (
                <span
                className={cn(
                    "ml-1 rounded-full border border-border px-1.5 py-0 font-mono text-[0.625rem]",
                    ACCENT_VALUE[level],
                )}
                >
                {data.entries.length}
                </span>
            )}
            </CardTitle>
            <div className="flex items-center gap-2">
                {data?.type === "series" && data.windowMinutes !== null && (
                <span className="font-mono text-[0.625rem] text-muted-foreground/60">
                    {data.interval} · {formatWindowLabel(data.windowMinutes)}
                </span>
                )}
                {tags.length > 1 && (
                <BlockTagSelector
                    tags={tags}
                    selectedTagId={selectedTagId}
                    onSelect={onSelectTag}
                />
                )}
                {showBackgroundDot && (
                <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                    aria-label="Mise à jour en cours"
                />
                )}
            </div>
      </CardHeader>
    )
}