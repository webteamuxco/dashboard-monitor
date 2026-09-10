"use client";

import { useEffect } from "react";
import { useProjectConfig } from "@/app/features/config/hooks/useProjectConfig";
import { useDashboardWindow } from "../state/useDashboardWindow";
import { presetsFromTimeInterval } from "../state/windowPresets";

/**
 * Re-applies the window presets when the active project changes.
 *
 * Mirrors `useActiveProject` and `useActivePanel`: the presets are a
 * project-wide Strapi setting, and `DashboardContent` only seeds the ones the
 * server resolved for the project it rendered — every later switch has to come
 * from the client.
 *
 * The current selection is read through `getState()` rather than subscribed to:
 * this reacts to the project's configuration, not to the user picking a window,
 * and a dependency on the value the effect itself writes would run it twice.
 */
export function useActiveWindow(documentId: string): void {
  const { data: config } = useProjectConfig(documentId);
  const hydrateFromStrapi = useDashboardWindow((s) => s.hydrateFromStrapi);

  useEffect(() => {
    if (!config) return;

    const { presets, initialWindowMinutes } = presetsFromTimeInterval(
      config.timeInterval,
    );
    const current = useDashboardWindow.getState().windowMinutes;
    const keepsSelection = presets.some(
      (preset) => preset.minutes === current,
    );

    hydrateFromStrapi(presets, keepsSelection ? current : initialWindowMinutes);
  }, [config, hydrateFromStrapi]);
}
