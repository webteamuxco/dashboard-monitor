"use client";

import { useEffect } from "react";
import { useProjects } from "@/app/features/config/hooks/useProjects";
import { useProjectConfig } from "@/app/features/config/hooks/useProjectConfig";
import { useSelectedProject } from "../state/useSelectedProject";

interface ActiveProject {
  documentId: string;
  projectId: string;
  refreshIntervalMs: number;
}

/**
 * Resolves the project the dashboard is currently pointed at.
 *
 * The user selects a Strapi project (`documentId`), but the monitor queries
 * (issues, errorRate, reservations) need the GlitchTip project id, which lives
 * in the selected project's `toolConfigurations`. `initialProjectId` is the
 * GlitchTip id of `initialDocumentId`, resolved server-side and used as the
 * fallback until the selected project's config has loaded.
 *
 * The refresh cadence comes from the selected project's Strapi `defaultConfig`;
 * `fallbackRefreshIntervalMs` applies only when a project has no `defaultConfig`.
 */
export function useActiveProject(
  initialDocumentId: string,
  initialProjectId: string,
  fallbackRefreshIntervalMs: number,
): ActiveProject {
  const { data: projects } = useProjects();
  const storedDocumentId = useSelectedProject((s) => s.documentId);
  const setDocumentId = useSelectedProject((s) => s.setDocumentId);

  useEffect(() => {
    void useSelectedProject.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!projects) return;
    const ids = projects.map((project) => project.documentId);
    if (!storedDocumentId || !ids.includes(storedDocumentId)) {
      setDocumentId(ids.includes(initialDocumentId) ? initialDocumentId : ids[0]);
    }
  }, [projects, storedDocumentId, initialDocumentId, setDocumentId]);

  const documentId = storedDocumentId ?? initialDocumentId;
  const { data: config } = useProjectConfig(documentId);
  const glitchtip = config?.toolConfigurations?.find(
    (configuration) => configuration.kind === "glitchtip",
  );
  const defaultConfig = config?.defaultConfig;

  return {
    documentId,
    projectId: glitchtip?.projectId ?? initialProjectId,
    refreshIntervalMs: defaultConfig?.refreshIntervalMs ?? fallbackRefreshIntervalMs,
  };
}
