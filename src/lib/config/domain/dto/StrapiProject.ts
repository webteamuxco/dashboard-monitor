export interface StrategyDto {
    name: string;
}

export interface MappedToolDto {
    documentId: string;
    name: string;
    strategies: StrategyDto[];
}

export interface GlitchtipConfigurationDto {
    __typename: "ComponentConfigGlitchtipConfiguration";
    id: string;
    url: string;
    projectId: string;
    organization: string;
    tool: { name: string } | null;
}

export interface PosthogConfigurationDto {
    __typename: "ComponentConfigPosthogConfiguration";
    id: string;
    url: string;
    projectId: string;
}

export type ToolConfigurationDto =
    | GlitchtipConfigurationDto
    | PosthogConfigurationDto;

export interface DefaultConfigDto {
    DefaultRefreshIntervalMS: number | null;
}

export interface ProjectDto {
    documentId: string;
    slug: string;
    mapped_tools: MappedToolDto[];
    tool_configuration: ToolConfigurationDto[];
    default_config: DefaultConfigDto | null;
}

export interface ProjectSummaryDto {
    documentId: string;
    publishedAt: string;
    title: string;
    updatedAt: string;
    slug: string;
}
