import { MonitorStrategy } from "./MonitorStrategy";
import { Level } from "./Level";

/**
 * Purely a front-end concern: which card component renders the KPI. It is
 * declared on the content type rather than on the strategy component, and
 * `DashboardBlock` carries its own, unrelated set of values.
 */
export type DashboardKpiType = "list" | "interval"

const INTERVAL_TYPE = "interval" satisfies DashboardKpiType;

/**
 * `interval` is the only type whose measure is scoped to the project's window
 * presets: every other one reads a total, and its query key therefore carries
 * no window at all — switching preset is not a cache miss for it. The field is
 * required in Strapi admin, so `null` only ever means an unpublished draft.
 */
export function isWindowedKpi(type: DashboardKpiType | null): boolean {
    return type === INTERVAL_TYPE;
}

export interface DashboardKpi {
    slug: string
    title: string
    name: string;
    id: string
    description: string
    icon: string
    level: Level
    order: number
    type: DashboardKpiType | null
    strategy?: MonitorStrategy
}
