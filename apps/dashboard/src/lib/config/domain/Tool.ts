import { ToolConfiguration } from "./tool/ToolConfiguration";

export interface DashboardKpi {
    slug: string
    name: string;
    id: string
    description: string
    configuration: ToolConfiguration
}