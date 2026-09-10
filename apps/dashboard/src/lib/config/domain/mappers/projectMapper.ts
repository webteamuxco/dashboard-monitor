import { Project } from "../Project";
import { ProjectSummary } from "../ProjectSummary";
import { ProjectConfiguration } from "../ProjectConfiguration";
import {
    DashboardPanelDto,
    DefaultConfigDto,
    ProjectDto,
    ProjectSummaryDto,
} from "../dto/StrapiProject";
import { DashboardPanel } from "../DashboardPanels";

function mapDefaultConfig(dto: DefaultConfigDto): ProjectConfiguration {
    return {
        refreshIntervalMs: dto.DefaultRefreshIntervalMS,
    };
}

export function mapDashboardPanel(dto: DashboardPanelDto): DashboardPanel {
    return {
       id: dto.documentId,
       icon: dto.icon,
       name: dto.name,
       order: dto.order,
       slug: dto.slug,
       isDevelopment: dto.is_development,
       displayName: dto.display_name
       
    };
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

export function mapProjectSummary(dto: ProjectSummaryDto): ProjectSummary {
    return {
        documentId: dto.documentId,
        title: dto.title,
        slug: dto.slug,
        publishedAt: dto.publishedAt,
        updatedAt: dto.updatedAt,
    };
}
