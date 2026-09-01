import { MappedTool } from "./MappedTools";
import { ToolConfiguration } from "./tool/ToolConfiguration";

export interface DashboardPanel {
    toolConfigurations?: ToolConfiguration[];
    mappedTools?: MappedTool[];
    name: string;
    displayName: string;
    id: string;
    icon: string;
    order: number;
    slug: string
}