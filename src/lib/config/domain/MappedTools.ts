import { Project } from "./Project";

export type ToolStrategy = {
    name: string;
};

export type MappedTool = {
    documentId?: string;
    name?: string;
    strategies?: ToolStrategy[];
    project?: Project[]
};
