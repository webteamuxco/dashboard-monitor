import { StrapiClient } from "./StrapiClient";
import { StrapiRepository } from "./StrapiRepository";
import { Project } from "./Project";
import { ProjectSummary } from "./ProjectSummary";
import { Strategy } from "./Strategy";

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

      isProjectHasStrategy(
        documentId: string,
        strategyName: string,
        toolSlug?: string | null,
      ): Promise<boolean> {
        return this.getRepository().isProjectHasStrategy(
          documentId,
          strategyName,
          toolSlug,
        )
      }

      getProjectStrategies(
        documentId: string,
      ): Promise<Strategy[] | null> {
        return this.getRepository().getProjectStrategies(
          documentId
        )
      }
}
