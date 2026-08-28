"use client";

import { useId } from "react";
import { useProjects } from "@/app/features/config/hooks/useProjects";
import { useSelectedProject } from "../state/useSelectedProject";
import { Folder } from "lucide-react";

interface ProjectSelectorProps {
  fallbackDocumentId: string;
}

export function ProjectSelector({ fallbackDocumentId }: ProjectSelectorProps) {
  const { data: projects } = useProjects();
  const documentId = useSelectedProject((s) => s.documentId) ?? fallbackDocumentId;
  const setDocumentId = useSelectedProject((s) => s.setDocumentId);
  const selectId = useId();

  if (!projects || projects.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[0.6875rem]">
      <label htmlFor={selectId} className="text-muted-foreground text-[0.725rem]">
        <Folder className="w-4 h-4"/>
      </label>
      <select
        id={selectId}
        value={documentId}
        aria-label="Projet"
        onChange={(e) => setDocumentId(e.target.value)}
        className="cursor-pointer bg-transparent text-foreground scheme-dark focus:outline-none [&>option]:bg-popover [&>option]:text-popover-foreground"
      >
        {projects.map((project) => (
          <option key={project.documentId} value={project.documentId}>
            {project.title}
          </option>
        ))}
      </select>
    </div>
  );
}
