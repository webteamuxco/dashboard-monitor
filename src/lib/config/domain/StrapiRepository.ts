import "server-only";
import { GraphQlQuery } from "@/lib/shared/domain/GraphqlQuery";
import { getProjectsQuery } from "./gql/GetProjects";
import { StrapiClient } from "./StrapiClient";
import { getProjectByIdQuery } from "./gql/GetProjectById";
import { ProjectDto, ProjectSummaryDto } from "./dto/StrapiProject";
import { mapProject, mapProjectSummary } from "./mappers/projectMapper";
import { Project } from "./Project";
import { ProjectSummary } from "./ProjectSummary";

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

    private async execute<T>(gql: GraphQlQuery): Promise<T> {
        const response = await fetch(`${this.client.getBaseUrl()}/graphql`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${this.client.getToken()}`,
            },
            body: JSON.stringify(gql),
        });

        if (!response.ok) {
            throw new Error(
                `Strapi request failed: ${response.status} ${response.statusText}`,
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
