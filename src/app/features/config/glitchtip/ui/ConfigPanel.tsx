"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGlitchTipConfig } from "../state/useDashboardConfig";
import { useDashboardConfig } from "../../shared/state/useDashboardConfig";
import {
  POLLING_INTERVAL_BOUNDS,
  type DashboardConfig,
} from "../domain/DashboardConfig";

interface DraftConfig {
  organizationSlug: string;
  projectsText: string;
  pollingIntervalSec: number;
  metricsEndpoint: string;
}

function configToDraft(config: DashboardConfig): DraftConfig {
  return {
    organizationSlug: config.organizationSlug,
    projectsText: config.projects.join(", "),
    pollingIntervalSec: config.pollingIntervalSec,
    metricsEndpoint: config.metricsEndpoint,
  };
}

function draftToConfig(draft: DraftConfig): DashboardConfig {
  const interval = clampInterval(draft.pollingIntervalSec);
  return {
    organizationSlug: draft.organizationSlug.trim(),
    projects: draft.projectsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    pollingIntervalSec: interval,
    metricsEndpoint: draft.metricsEndpoint.trim(),
  };
}

function clampInterval(value: number): number {
  const { min, max } = POLLING_INTERVAL_BOUNDS;
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

export function GlitchTipConfigPanel() {
  const config = useGlitchTipConfig((s) => s.config);
  const setConfig = useGlitchTipConfig((s) => s.setConfig);
  const isPanelOpen = useDashboardConfig((s) => s.isPanelOpen);
  const closePanel = useDashboardConfig((s) => s.closePanel);

  const [draft, setDraft] = useState<DraftConfig>(() => configToDraft(config));

  useEffect(() => {
    if (isPanelOpen) {
      setDraft(configToDraft(config));
    }
  }, [isPanelOpen, config]);

  const isOrgValid = draft.organizationSlug.trim().length > 0;
  const isProjectsValid = draft.projectsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length > 0;
  const canApply = isOrgValid && isProjectsValid;

  const handleApply = () => {
    if (!canApply) return;
    setConfig(draftToConfig(draft));
    closePanel();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
        GlitchTip
      </header>

      <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Organisation *"
          input={
            <input
              type="text"
              value={draft.organizationSlug}
              onChange={(e) =>
                setDraft((d) => ({ ...d, organizationSlug: e.target.value }))
              }
              placeholder="mon-organisation"
              className={inputCn}
              aria-invalid={!isOrgValid}
            />
          }
        />

        <Field
          label="Projets * (séparés par des virgules)"
          input={
            <input
              type="text"
              value={draft.projectsText}
              onChange={(e) =>
                setDraft((d) => ({ ...d, projectsText: e.target.value }))
              }
              placeholder="api, frontend, worker"
              className={inputCn}
              aria-invalid={!isProjectsValid}
            />
          }
        />

        <Field
          label={`Intervalle polling (s) · ${POLLING_INTERVAL_BOUNDS.min}–${POLLING_INTERVAL_BOUNDS.max}`}
          input={
            <input
              type="number"
              value={draft.pollingIntervalSec}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  pollingIntervalSec: Number(e.target.value),
                }))
              }
              min={POLLING_INTERVAL_BOUNDS.min}
              max={POLLING_INTERVAL_BOUNDS.max}
              className={inputCn}
            />
          }
        />

        <Field
          label="Endpoint métriques (JSON)"
          input={
            <input
              type="text"
              value={draft.metricsEndpoint}
              onChange={(e) =>
                setDraft((d) => ({ ...d, metricsEndpoint: e.target.value }))
              }
              placeholder="https://api.example.com/metrics"
              className={inputCn}
            />
          }
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleApply}
          disabled={!canApply}
        >
          Appliquer la configuration
        </Button>
        <Button variant="outline" size="sm" onClick={closePanel}>
          Annuler
        </Button>
        {!canApply && (
          <span className="font-mono text-[0.6875rem] text-muted-foreground">
            Champs obligatoires manquants
          </span>
        )}
      </div>
    </div>
  );
}

const inputCn =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary aria-[invalid=true]:border-destructive";

function Field({ label, input }: { label: string; input: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[0.6875rem] text-muted-foreground">
        {label}
      </span>
      {input}
    </label>
  );
}
