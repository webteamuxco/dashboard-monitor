export const ERROR_MONITOR_STRATEGY_ENUM = "error-monitor"
export const LOG_MONITOR_STRATEGY_ENUM = "log-monitor"
export const TRACKER_MONITOR_STRATEGY_ENUM = "tracker-monitor"

export type StrategiesKey = 
    typeof ERROR_MONITOR_STRATEGY_ENUM 
    | typeof LOG_MONITOR_STRATEGY_ENUM 
    | typeof TRACKER_MONITOR_STRATEGY_ENUM
