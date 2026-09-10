import { MonitorStrategy, MonitorStrategyTag } from "./MonitorStrategy";
import { Level } from "./Level";
import { LOG_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";

/**
 * Purely a front-end concern: which card component renders the KPI. It is
 * declared on the content type rather than on the strategy component, and
 * `DashboardBlock` carries its own, unrelated set of values.
 */
export type DashboardBlockType = "list" | "rate" | "stackedBar" | "bar"

const RATE_TYPE = "rate" satisfies DashboardBlockType;
const BAR_TYPE = "bar" satisfies DashboardBlockType;
const STACKED_BAR = "stackedBar" satisfies DashboardBlockType;
const LIST_TYPE = "list" satisfies DashboardBlockType;

export interface DashboardBlock {
    slug: string
    title: string
    name: string;
    id: string
    description: string
    icon: string
    level: Level | null
    order: number
    type: DashboardBlockType | null
    strategy?: MonitorStrategy
}


const WINDOWED_TYPES: readonly DashboardBlockType[] = [
    RATE_TYPE,
    BAR_TYPE,
    STACKED_BAR,
];

export function isWindowedBlock(type: DashboardBlockType | null): boolean {
    return type !== null && WINDOWED_TYPES.includes(type);
}

export function isListBlock(type: DashboardBlockType | null): boolean {
    return type === LIST_TYPE;
}

export function logMonitorTags(block: DashboardBlock): MonitorStrategyTag[] {
    return block.strategy?.kind === LOG_MONITOR_STRATEGY_ENUM
        ? block.strategy.tags
        : [];
}