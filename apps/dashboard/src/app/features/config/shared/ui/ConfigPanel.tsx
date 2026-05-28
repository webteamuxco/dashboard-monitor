"use client";

import { Settings2 } from "lucide-react";
import { useDashboardConfig } from "../state/useDashboardConfig";
import { GLITCHTIP } from "@/lib/logMonitor/LogMonitorTypeEnums";
import { GlitchTipConfigPanel } from "../../glitchtip/ui/ConfigPanel";
import type { MonitoringTool } from "../domain/DashboardConfig";

const toolPanels: Record<string, () => React.ReactNode> = {
  [GLITCHTIP]: () => <GlitchTipConfigPanel />,
};

export function ConfigPanel() {
  const isPanelOpen = useDashboardConfig((s) => s.isPanelOpen);
  const selectedLogTool = useDashboardConfig((s) => s.config.selectedLogTool);
  const selectedErrorTool = useDashboardConfig((s) => s.config.selectedErrorTool);

  if (!isPanelOpen) return null;

  const uniqueTools = Array.from(
    new Set<MonitoringTool>(
      [selectedLogTool, selectedErrorTool].filter(
        (t): t is MonitoringTool => t !== null,
      ),
    ),
  );

  return (
    <section
      id="dashboard-config-panel"
      aria-label="Configurations"
      className="mx-4 mt-3 space-y-3"
    >
      <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
        Configurations
      </header>

      {uniqueTools.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-4 font-mono text-[0.6875rem] text-muted-foreground">
          Sélectionnez un outil de monitoring dans le header pour afficher sa
          configuration.
        </p>
      ) : (
        uniqueTools.map((tool) => {
          const render = toolPanels[tool];
          if (!render) return null;
          return <div key={tool}>{render()}</div>;
        })
      )}
    </section>
  );
}
