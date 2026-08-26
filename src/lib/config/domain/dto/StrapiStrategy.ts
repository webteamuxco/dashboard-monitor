import { StrategiesKey } from "@/lib/shared/strategiesEnum";

export interface ToolDto {
    slug: string;
    name: string;
}

export interface StrategyDto {
    mapped_tool: { projects: { documentId: string }[], tool: ToolDto | null; } | null;
    name: StrategiesKey;
}
