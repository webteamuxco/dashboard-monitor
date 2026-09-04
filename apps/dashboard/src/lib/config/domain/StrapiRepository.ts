import "server-only";
import { GraphQlQuery } from "@/lib/shared/domain/GraphqlQuery";
import { getProjectsQuery } from "./gql/projects/GetProjects";
import { StrapiClient } from "./StrapiClient";
import { getProjectByIdQuery } from "./gql/projects/GetProjectById";
import { DashboardPanelDto, ProjectDto, ProjectSummaryDto } from "./dto/StrapiProject";
import { mapDashboardPanel, mapProject, mapProjectStrategy, mapProjectSummary } from "./mappers/projectMapper";
import { Project } from "./Project";
import { ProjectSummary } from "./ProjectSummary";
import { getSpecificStrategyByDocumentIdQuery } from "./gql/strategies/GetSpecificStrategyByDocumentId";
import { StrategyDto } from "./dto/StrapiStrategy";
import { getStrategiesByDocumentId } from "./gql/strategies/GetStrategiesByDocumentId";
import { Strategy } from "./Strategy";
import { DashboardPanel } from "./DashboardPanels";
import { getPanelsByProjectIdQuery } from "./gql/panels/GetPanelsByProjectId";
import { getPanelByIdQuery } from "./gql/panels/GetPanelsById";

interface GraphQlResponse<T> {
    data?: T;
    errors?: { message: string }[];
}

export class StrapiRepository {
    constructor(private readonly client: StrapiClient) {}

    async getProjects(): Promise<ProjectSummary[]> {
        const body = await this.execute<{ projects: ProjectSummaryDto[] }>(
            getProjectsQuery(),
        );
        return body.projects.map(mapProjectSummary);
    }

    async getProjectById(projectId: string): Promise<Project | null> {
        const body = await this.execute<{ project: ProjectDto | null }>(
            getProjectByIdQuery(projectId),
        );
        return body.project ? mapProject(body.project) : null;
    }

    async getPanelById(panelId: string): Promise<DashboardPanel | null> {
        const body = await this.execute<{ dashboardPanel: DashboardPanelDto | null }>(
            getPanelByIdQuery(panelId),
        );

        return body.dashboardPanel ? mapDashboardPanel(body.dashboardPanel) : null;
    }

    async isPanelHasStrategy(
        documentId: string,
        strategyName: string,
        toolSlug?: string | null,
    ): Promise<boolean> {
             
        const body = await this.execute<{ strategies: StrategyDto[] }>(
            getSpecificStrategyByDocumentIdQuery(documentId, strategyName, toolSlug),
        );

        return body.strategies.length > 0;
    }

    async getProjectStrategies(
        documentId: string,
        selectedPanel?: string | null
    ): Promise<Strategy[] | null> {
        const body = await this.execute<{ strategies: StrategyDto[] }>(
            getStrategiesByDocumentId(documentId, selectedPanel),
        );

        if (!body.strategies.length) {
            return null
        }

        return body.strategies.map(mapProjectStrategy);
    }

    async getProjectPanels(
        documentId: string,
        showDevelopmentPanel: boolean
    ): Promise<DashboardPanel[] | null> {
        const body = await this.execute<{ dashboardPanels: DashboardPanelDto[] }>(
            getPanelsByProjectIdQuery(documentId, showDevelopmentPanel),
        );

        if (!body.dashboardPanels.length) {
            return null
        }

        return body.dashboardPanels.map(mapDashboardPanel);
    }


    private async execute<T>(gql: GraphQlQuery): Promise<T> {
        const endpoint = `${this.client.getBaseUrl()}/graphql`;

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${this.client.getToken()}`,
            },
            body: JSON.stringify(gql),
        });

        if (!response.ok) {
            // Strapi answers 405 to a POST on any path that is not the GraphQL
            // endpoint, so the URL belongs in the message: it is the only way to
            // tell a misconfigured STRAPI_BASE_URL from a Strapi-side failure.
            throw new Error(
                `Strapi request failed: ${response.status} ${response.statusText} on ${endpoint}`,
            );
        }

        const payload = (await response.json()) as GraphQlResponse<T>;

        if (payload.errors?.length) {
            throw new Error(
                `Strapi GraphQL error: ${payload.errors
                    .map((error) => error.message)
                    .join("; ")}`,
            );
        }

        if (!payload.data) {
            throw new Error("Strapi GraphQL response missing data");
        }

        return payload.data;
    }
}
