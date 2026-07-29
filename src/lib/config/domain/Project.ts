import { ProjectConfiguration } from "./ProjectConfiguration";
import { MappedTool } from "./MappedTools";
import { ToolConfiguration } from "./tool/ToolConfiguration";

export type Project = {
    documentId: string;
    slug: string;
    mappedTools: MappedTool[];
    toolConfigurations: ToolConfiguration[];
    defaultConfig?: ProjectConfiguration;
};
