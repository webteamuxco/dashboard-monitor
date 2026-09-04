import { StrapiClient } from "./StrapiClient";
import { StrapiRepository } from "./StrapiRepository";
import { Project } from "./Project";
import { ProjectSummary } from "./ProjectSummary";
import { Strategy } from "./Strategy";
import { DashboardPanel } from "./DashboardPanels";

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

      getPanelById(panelId: string): Promise<DashboardPanel | null> {
        return this.getRepository().getPanelById(panelId)
      }

      isPanelHasStrategy(
        documentId: string,
        strategyName: string,
        toolSlug?: string | null,
      ): Promise<boolean> {
        return this.getRepository().isPanelHasStrategy(
          documentId,
          strategyName,
          toolSlug,
        )
      }

      getProjectStrategies(
        documentId: string,
        selectedPanel?: string | null
      ): Promise<Strategy[] | null> {
        return this.getRepository().getProjectStrategies(
          documentId,
          selectedPanel
        )
      }

      getProjectPanels(
        documentId: string,
        showDevelopmentPanel: boolean
      ): Promise<DashboardPanel[] | null> {
        return this.getRepository().getProjectPanels(
          documentId,
          showDevelopmentPanel
        )
      }
}
