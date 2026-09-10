import { ProjectDto, ProjectSummaryDto } from "../dto/StrapiProject";
import { getProjectByIdQuery } from "../gql/projects/GetProjectById";
import { getProjectsQuery } from "../gql/projects/GetProjects";
import { mapProject, mapProjectSummary } from "../mappers/projectMapper";
import { Project } from "../Project";
import { ProjectSummary } from "../ProjectSummary";
import { AbstractStrapiRepository } from "./AbstractStrapiRepository";

export class ProjectRepository extends AbstractStrapiRepository {

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
}