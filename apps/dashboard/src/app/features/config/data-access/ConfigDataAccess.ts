import "server-only";
import { cache } from "react";
import { StrapiClientFactory } from "@/lib/config/domain/StrapiClientFactory";
import { StrapiClientStrategy } from "@/lib/config/domain/StrapiStrategy";
import { Project } from "@/lib/config/domain/Project";
import { ProjectSummary } from "@/lib/config/domain/ProjectSummary";
import { DashboardPanel } from "@/lib/config/domain/DashboardPanels";
import { DashboardKpiFilters } from "@/app/api/config/dashboard-kpis/filters";
import { DashboardKpi } from "@/lib/config/domain/DashboardKpi";
import { DashboardBlocksFilters } from "@/app/api/config/dashboard-blocks/filters";
import { DashboardBlock } from "@/lib/config/domain/DashboardBlock";

function getConfigMonitor(): StrapiClientStrategy {
    const factory = new StrapiClientFactory()
    return factory.create()
}

const fetchProject = cache((projectId: string): Promise<Project | null> => {
  return getConfigMonitor().getProjectById(projectId)
});

const fetchProjectList = cache((): Promise<ProjectSummary[]> => {
  return getConfigMonitor().getProjects()
});

const fetchDashboardKpis = cache((filters: DashboardKpiFilters): Promise<DashboardKpi[] | null> => {
  return getConfigMonitor().getDashboardKpis(filters)
});

const fetchDashboardBlock = cache((filters: DashboardBlocksFilters): Promise<DashboardBlock[] | null> => {
  return getConfigMonitor().getDashboardBlocks(filters)
});

const fetchProjectPanels = cache((projectId: string, showDevelopmentPanel: boolean): Promise<DashboardPanel[] | null> => {
  return getConfigMonitor().getProjectPanels(projectId, showDevelopmentPanel)
});



export class ConfigDataAccess {

  getProjectsList(): Promise<ProjectSummary[]> {
    return fetchProjectList();
  }

  getProjectConfig(
    projectId: string
  ): Promise<Project | null> {
    return fetchProject(projectId);
  }

   getProjectPanels(
    projectId: string,
    showDevelopmentPanel: boolean
   ) {
      return fetchProjectPanels(projectId, showDevelopmentPanel);
   }

  getDashboardKpis(
    filter: DashboardKpiFilters,
  ): Promise<DashboardKpi[] | null> {
    return fetchDashboardKpis(filter);
  }

  getDashboardBlocks(
    filter: DashboardBlocksFilters,
  ): Promise<DashboardBlock[] | null> {
    return fetchDashboardBlock(filter);
  }
}

export const configDataAccess = new ConfigDataAccess();
