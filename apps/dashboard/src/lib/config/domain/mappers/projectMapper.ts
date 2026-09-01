import { Project } from "../Project";
import { ProjectSummary } from "../ProjectSummary";
import { ProjectConfiguration } from "../ProjectConfiguration";
import { MappedTool } from "../MappedTools";
import { ToolConfiguration } from "../tool/ToolConfiguration";
import {
    DashboardPanelDto,
    DefaultConfigDto,
    MappedToolDto,
    ProjectDto,
    ProjectSummaryDto,
    ToolConfigurationDto,
} from "../dto/StrapiProject";
import { StrategyDto } from "../dto/StrapiStrategy";
import { Strategy } from "../Strategy";
import { DashboardPanel } from "../DashboardPanels";

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

export function mapDashboardPanel(dto: DashboardPanelDto): DashboardPanel {
    return {
       toolConfigurations: dto.tool_configuration?.map(mapToolConfiguration),
       mappedTools: dto.mapped_tools?.map(mapMappedTool),
       id: dto.documentId,
       icon: dto.icon,
       name: dto.name,
       order: dto.order,
       slug: dto.slug,
       displayName: dto.display_name
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
                toolSlug: dto.tool?.slug ?? "",
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
        defaultConfig: dto.default_config
            ? mapDefaultConfig(dto.default_config)
            : undefined,
        timeInterval: dto.timeInterval
    };
}

export function mapProjectStrategy(dto: StrategyDto): Strategy {
    return {
        name: dto.name,
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
