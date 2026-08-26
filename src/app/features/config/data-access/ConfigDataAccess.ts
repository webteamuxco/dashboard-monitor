import "server-only";
import { cache } from "react";
import { StrapiClientFactory } from "@/lib/config/domain/StrapiClientFactory";
import { StrapiClientStrategy } from "@/lib/config/domain/StrapiStrategy";
import { Project } from "@/lib/config/domain/Project";
import { ProjectSummary } from "@/lib/config/domain/ProjectSummary";
import { Strategy } from "@/lib/config/domain/Strategy";

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

const fetchProjectStrategies = cache((projectId: string): Promise<Strategy[] | null> => {
  return getConfigMonitor().getProjectStrategies(projectId)
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

  getProjectStrategies(
    projectId: string
  ): Promise<Strategy[] | null> {
    return fetchProjectStrategies(projectId);
  }
}

export const configDataAccess = new ConfigDataAccess();
