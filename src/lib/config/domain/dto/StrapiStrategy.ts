export interface ToolDto {
    slug: string;
    name: string;
}

export interface StrategyDto {
    mapped_tool: { projects: { documentId: string }[] } | null;
    tool: ToolDto | null;
    name: string;
}
