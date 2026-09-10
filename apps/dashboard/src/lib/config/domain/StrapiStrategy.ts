import { StrapiClient } from "./StrapiClient";
import { Project } from "./Project";
import { ProjectSummary } from "./ProjectSummary";
import { DashboardPanel } from "./DashboardPanels";
import { ProjectRepository } from "./repositories/ProjectRepository";
import { PanelRepository } from "./repositories/PanelRepository";
import { DashboardKpiFilters } from "@/app/api/config/dashboard-kpis/filters";
import { DashboardKpiRepository } from "./repositories/DashboardKpiRepository";
import { DashboardBlockRepository } from "./repositories/DashboardBlockRepository";
import { DashboardKpi } from "./DashboardKpi";
import { ToolWiring } from "./ToolWiring";
import { DashboardBlocksFilters } from "@/app/api/config/dashboard-blocks/filters";
import { DashboardBlock } from "./DashboardBlock";

export class StrapiClientStrategy {

  readonly projectRepository: ProjectRepository
  readonly panelRepository: PanelRepository
  readonly dashboardKpiRepository: DashboardKpiRepository
  readonly dashboardBlockRepository: DashboardBlockRepository


  constructor(client: StrapiClient) {
    this.projectRepository = new ProjectRepository(client)
    this.panelRepository = new PanelRepository(client)
    this.dashboardKpiRepository = new DashboardKpiRepository(client)
    this.dashboardBlockRepository = new DashboardBlockRepository(client)
  }

      // PROJECTS

      getProjects(): Promise<ProjectSummary[]> {
        return this.projectRepository.getProjects()
      }

      getProjectById(projectId: string): Promise<Project | null> {
        return this.projectRepository.getProjectById(projectId)
      }

      // PANELS

      getProjectPanels(
        documentId: string,
        showDevelopmentPanel: boolean
      ): Promise<DashboardPanel[] | null> {
        return this.panelRepository.getProjectPanels(
          documentId,
          showDevelopmentPanel
        )
      }

      // KPIS

      getDashboardKpis(
        filters: DashboardKpiFilters
      ): Promise<DashboardKpi[] | null> {
        return this.dashboardKpiRepository.getDashboardKpi(
          filters
        )
      }


      getKpiWiring(kpiId: string): Promise<ToolWiring | null> {
        return this.dashboardKpiRepository.getKpiWiring(kpiId)
      }

      // BLOCKS

      getDashboardBlocks(
        filters: DashboardBlocksFilters
      ): Promise<DashboardBlock[] | null> {
        return this.dashboardBlockRepository.getDashboardBlocks(
          filters
        )
      }


      getBlockWiring(blockId: string): Promise<ToolWiring | null> {
        return this.dashboardBlockRepository.getBlockWiring(blockId)
      }
}
