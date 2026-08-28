export interface MappedToolStrategyDto {
    name: string;
}

export type ALLOWED_INTERVAL = "seconds" | "minutes" | "days" | "hours"
export interface TimeIntervalDto {
    duration: number;
    interval: ALLOWED_INTERVAL
}

export interface MappedToolDto {
    documentId: string;
    name: string;
    strategies: MappedToolStrategyDto[];
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
    timeInterval: TimeIntervalDto[]
}

export interface ProjectSummaryDto {
    documentId: string;
    publishedAt: string;
    title: string;
    updatedAt: string;
    slug: string;
}
