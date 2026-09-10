import { LogMonitorTags, StrategyDto } from "../dto/StrapiStrategy";
import { MonitorStrategy, MonitorStrategyTag } from "../MonitorStrategy";
import { dynamicZoneError } from "./dynamicZoneError";
import {
    ERROR_MONITOR_STRATEGY_ENUM,
    LOG_MONITOR_STRATEGY_ENUM,
    TRACKER_MONITOR_STRATEGY_ENUM,
} from "@/lib/shared/strategiesEnum";

export function mapMonitorStrategy(
    dtos: (StrategyDto | null)[],
): MonitorStrategy | undefined {
    const strategy = dtos?.[0];

    if (!strategy) {
        return undefined;
    }

    switch (strategy.__typename) {
        case "ComponentStrategyErrorMonitor":
            return {
                kind: ERROR_MONITOR_STRATEGY_ENUM,
                id: strategy.id,
            };
        case "ComponentStrategyLogMonitor":
            return {
                kind: LOG_MONITOR_STRATEGY_ENUM,
                id: strategy.id,
                tags: strategy.tags.flatMap((tag) =>
                    tag ? [mapMonitorStrategyTag(tag)] : [],
                ),
            };
        case "ComponentStrategyTrackerMonitor":
            return {
                kind: TRACKER_MONITOR_STRATEGY_ENUM,
                id: strategy.id,
            };
        case "Error":
            throw dynamicZoneError("strategy", strategy);
    }
}

function mapMonitorStrategyTag(dto: LogMonitorTags): MonitorStrategyTag {
    return {
        id: dto.id,
        name: dto.name,
        value: dto.value,
        description: dto.description,
    };
}
