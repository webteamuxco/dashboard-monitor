"use client";

import { useEffect } from "react";
import { usePanels } from "@/app/features/config/hooks/usePannels";
import type { DashboardPanel } from "@/lib/config/domain/DashboardPanels";
import { useSelectedPanel } from "../state/useSelectedPanel";

interface ActivePanel {
  panelId: string;
  panelSlug: string | null;
  panels: DashboardPanel[] | undefined;
}

/**
 * Resolves the dashboard panel the kiosk is currently pointed at.
 *
 * Mirrors `useActiveProject`, and lives here rather than in `PannelSelector`
 * because that selector is only mounted in interactive mode — a read-only
 * kiosk must still resolve a panel, otherwise no widget mounts at all.
 *
 * The stored slug is reconciled against the project's panels instead of being
 * trusted: it may belong to another project (two projects can both have a
 * `production` panel), so the id is always re-resolved from the list.
 */
export function useActivePanel(documentId: string): ActivePanel {
  const { data: panels } = usePanels(documentId);

  const panelId = useSelectedPanel((s) => s.pannelId);
  const panelSlug = useSelectedPanel((s) => s.panelSlug);
  const setPanelId = useSelectedPanel((s) => s.setPanelId);
  const setPanelSlug = useSelectedPanel((s) => s.setPanelSlug);
  const setPanelIcon = useSelectedPanel((s) => s.setPanelIcon);

  useEffect(() => {
    void useSelectedPanel.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!panels?.length) return;

    const target = panels.find((panel) => panel.slug === panelSlug) ?? panels[0];
    if (target.id === panelId) return;

    setPanelId(target.id);
    setPanelSlug(target.slug);
    setPanelIcon(target.icon);
  }, [panels, panelSlug, panelId, setPanelId, setPanelSlug, setPanelIcon]);

  return { panelId, panelSlug, panels };
}
