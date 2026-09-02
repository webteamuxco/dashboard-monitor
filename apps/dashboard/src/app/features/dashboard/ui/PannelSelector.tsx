"use client";

import { createElement, useId } from "react";
import { useSelectedProject } from "../state/useSelectedProject";
import { useSelectedPanel } from "../state/useSelectedPanel";
import { usePanels } from "../../config/hooks/usePannels";
import { icons, type LucideIcon } from "lucide-react";
interface ProjectSelectorProps {
  fallbackDocumentId: string;
}

function getLucideIcon(name?: string | null): LucideIcon {
  if (!name) {
    return icons.Circle;
  }

  const iconName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return icons[iconName as keyof typeof icons] ?? icons.Circle;
}

export function PannelSelector({ fallbackDocumentId }: ProjectSelectorProps) {
  const documentId =
    useSelectedProject((s) => s.documentId) ?? fallbackDocumentId;

  const panelSlug = useSelectedPanel((s) => s.panelSlug);

  const setPanelSlug = useSelectedPanel((s) => s.setPanelSlug);
  const setPanelIcon = useSelectedPanel((s) => s.setPanelIcon);
  const setPanelId = useSelectedPanel((s) => s.setPanelId);

  const selectId = useId();

  // Resolving the active panel is useActivePanel's job — this selector is only
  // mounted in interactive mode, so it can only ever handle user changes.
  const { data: panels } = usePanels(documentId);

  if (!documentId || !panels?.length) {
    return null;
  }

  const selectedPannel =
    panels.find((panel) => panel.slug === panelSlug) ?? panels[0];

  const icon = getLucideIcon(selectedPannel.icon);

  if (panels.length < 2) { return }

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[0.6875rem]">
      <label
        htmlFor={selectId}
        className="text-muted-foreground text-[0.725rem]"
      >
        {createElement(icon, {
          className: "h-4 w-4",
        })}
      </label>

      <select
        id={selectId}
        value={panelSlug ?? panels[0].slug}
        aria-label="Panneau"
        className="cursor-pointer bg-transparent text-foreground scheme-dark focus:outline-none [&>option]:bg-popover [&>option]:text-popover-foreground"
        onChange={(e) => {
          const slug = e.target.value;

          const selectedPanel = panels.find(
            (panel) => panel.slug === slug,
          );

          if (!selectedPanel) {
            return;
          }

          setPanelId(selectedPanel.id);
          setPanelSlug(selectedPanel.slug);
          setPanelIcon(selectedPanel.icon);
        }}
      >
        {panels.map((panel) => (
          <option key={panel.name} value={panel.slug}>
            {panel.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
