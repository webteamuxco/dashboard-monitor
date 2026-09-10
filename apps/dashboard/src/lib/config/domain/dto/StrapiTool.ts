import { DynamicZoneErrorDto } from "./StrapiDynamicZone";
import { StrategyDto } from "./StrapiStrategy";

export interface GlitchtipConfigurationDto {
    __typename: "ComponentConfigGlitchtipConfiguration";
    id: string
    url: string
    projectId: string
    organization: string | null
}

export interface PosthogConfigurationDto {
    __typename: "ComponentConfigPosthogConfiguration";
    id: string
    url: string
    projectId: string
}

export type ToolConfigurationDto =
    | GlitchtipConfigurationDto
    | PosthogConfigurationDto
    | DynamicZoneErrorDto;

export interface ToolDto {
    documentId: string
    name: string
    slug: string
    configuration: (ToolConfigurationDto | null)[]
}

/**
 * The wiring projection of a dashboard element. `dashboardKpi` and
 * `dashboardBlock` declare the very same `strategy` + `tool` pair in Strapi, so
 * one DTO and one mapper cover both — only the query's entry field differs.
 */
export interface ToolWiringDto {
    documentId: string
    strategy: (StrategyDto | null)[]
    tool: ToolDto | null
}
