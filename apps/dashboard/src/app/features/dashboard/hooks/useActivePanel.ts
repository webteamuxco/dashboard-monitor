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
  const clearPanel = useSelectedPanel((s) => s.clearPanel);

  useEffect(() => {
    void useSelectedPanel.persist.rehydrate();
  }, []);

  useEffect(() => {
    // `undefined` is "still loading" and must keep the current selection —
    // repainting the kiosk on every project switch would be worse than a stale
    // frame. `null` / `[]` is an answer: the project has no panel, and holding
    // the previous project's selection would keep its widgets on screen.
    if (panels === undefined) return;

    if (!panels.length) {
      if (panelId === "" && panelSlug === null) return;
      clearPanel();
      return;
    }

    const target = panels.find((panel) => panel.slug === panelSlug) ?? panels[0];
    if (target.id === panelId) return;

    setPanelId(target.id);
    setPanelSlug(target.slug);
    setPanelIcon(target.icon);
  }, [
    panels,
    panelSlug,
    panelId,
    setPanelId,
    setPanelSlug,
    setPanelIcon,
    clearPanel,
  ]);

  return { panelId, panelSlug, panels };
}
