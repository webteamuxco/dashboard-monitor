export type ToolStrategy = {
    name: string;
};

export type MappedTool = {
    documentId: string;
    name: string;
    strategies: ToolStrategy[];
};
