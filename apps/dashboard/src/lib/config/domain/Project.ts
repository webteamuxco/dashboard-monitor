import { ProjectConfiguration } from "./ProjectConfiguration";
import { MappedTool } from "./MappedTools";
import { ToolConfiguration } from "./tool/ToolConfiguration";
import { TimeInterval } from "./TimeInterval";

export type Project = {
    documentId: string;
    slug: string;
    mappedTools?: MappedTool[];
    toolConfigurations?: ToolConfiguration[];
    defaultConfig?: ProjectConfiguration;
    timeInterval?: TimeInterval[]
};
