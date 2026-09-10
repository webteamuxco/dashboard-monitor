import { DynamicZoneErrorDto } from "./StrapiDynamicZone";

export interface StrategyErrorMonitorDto {
    __typename: "ComponentStrategyErrorMonitor";
    id: string
}

export interface StrategyLogMonitor {
    __typename: "ComponentStrategyLogMonitor";
    id: string
    tags: (LogMonitorTags | null)[]
}

export interface StrategyTrackerMonitor {
    __typename: "ComponentStrategyTrackerMonitor";
    id: string
}

export type LogMonitorTags = {
    id: string
    value: string
    name: string
    description: string | null
}

export type StrategyDto =
    | StrategyErrorMonitorDto
    | StrategyLogMonitor
    | StrategyTrackerMonitor
    | DynamicZoneErrorDto;
