import { StrapiClient } from "./StrapiClient";
import { StrapiRepository } from "./StrapiRepository";
import { Project } from "./Project";
import { ProjectSummary } from "./ProjectSummary";

export class StrapiClientStrategy {
      constructor(
        private readonly client: StrapiClient,
      ) {}

      getRepository(): StrapiRepository {
        return new StrapiRepository(this.client)
      }

      getProjects(): Promise<ProjectSummary[]> {
        return this.getRepository().getProjects()
      }

      getProjectById(projectId: string): Promise<Project | null> {
        return this.getRepository().getProjectById(projectId)
      }
}
