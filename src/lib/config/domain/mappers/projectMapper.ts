import { Project } from "../Project";
import { ProjectSummary } from "../ProjectSummary";
import { ProjectConfiguration } from "../ProjectConfiguration";
import { MappedTool } from "../MappedTools";
import { ToolConfiguration } from "../tool/ToolConfiguration";
import {
    DefaultConfigDto,
    MappedToolDto,
    ProjectDto,
    ProjectSummaryDto,
    ToolConfigurationDto,
} from "../dto/StrapiProject";

function mapDefaultConfig(dto: DefaultConfigDto): ProjectConfiguration {
    return {
        refreshIntervalMs: dto.DefaultRefreshIntervalMS,
    };
}

function mapMappedTool(dto: MappedToolDto): MappedTool {
    return {
        documentId: dto.documentId,
        name: dto.name,
        strategies: dto.strategies.map((strategy) => ({ name: strategy.name })),
    };
}

function mapToolConfiguration(dto: ToolConfigurationDto): ToolConfiguration {
    switch (dto.__typename) {
        case "ComponentConfigGlitchtipConfiguration":
            return {
                kind: "glitchtip",
                id: dto.id,
                url: dto.url,
                projectId: dto.projectId,
                organization: dto.organization,
                toolName: dto.tool?.name ?? "",
            };
        case "ComponentConfigPosthogConfiguration":
            return {
                kind: "posthog",
                id: dto.id,
                url: dto.url,
                projectId: dto.projectId,
            };
    }
}

export function mapProject(dto: ProjectDto): Project {
    return {
        documentId: dto.documentId,
        slug: dto.slug,
        mappedTools: dto.mapped_tools.map(mapMappedTool),
        toolConfigurations: dto.tool_configuration.map(mapToolConfiguration),
        defaultConfig: dto.default_config
            ? mapDefaultConfig(dto.default_config)
            : undefined,
        timeInterval: dto.timeInterval
    };
}

export function mapProjectSummary(dto: ProjectSummaryDto): ProjectSummary {
    return {
        documentId: dto.documentId,
        title: dto.title,
        slug: dto.slug,
        publishedAt: dto.publishedAt,
        updatedAt: dto.updatedAt,
    };
}
