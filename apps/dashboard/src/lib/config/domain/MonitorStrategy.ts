import {
    ERROR_MONITOR_STRATEGY_ENUM,
    LOG_MONITOR_STRATEGY_ENUM,
    TRACKER_MONITOR_STRATEGY_ENUM,
} from "@/lib/shared/strategiesEnum";

export interface MonitorStrategyTag {
    id: string
    name: string
    value: string
    description: string | null
}

export interface ErrorMonitorStrategy {
    kind: typeof ERROR_MONITOR_STRATEGY_ENUM
    id: string
}

export interface LogMonitorStrategy {
    kind: typeof LOG_MONITOR_STRATEGY_ENUM
    id: string
    tags: MonitorStrategyTag[]
}

export interface TrackerMonitorStrategy {
    kind: typeof TRACKER_MONITOR_STRATEGY_ENUM
    id: string
}

export type MonitorStrategy =
    | ErrorMonitorStrategy
    | LogMonitorStrategy
    | TrackerMonitorStrategy;
