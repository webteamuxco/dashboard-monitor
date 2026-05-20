"use client";

import { useId } from "react";
import { ENVIRONMENT_OPTIONS } from "../state/environments";
import { useEnvironment } from "../state/useEnvironment";

const ALL_VALUE = "";

export function EnvironmentSelector() {
  const environment = useEnvironment((s) => s.environment);
  const setEnvironment = useEnvironment((s) => s.setEnvironment);
  const selectId = useId();

  if (ENVIRONMENT_OPTIONS.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[0.6875rem]">
      <label htmlFor={selectId} className="text-muted-foreground">
        env
      </label>
      <select
        id={selectId}
        value={environment ?? ALL_VALUE}
        aria-label="Environnement"
        onChange={(e) => setEnvironment(e.target.value || null)}
        className="bg-transparent text-foreground scheme-dark focus:outline-none [&>option]:bg-popover [&>option]:text-popover-foreground"
      >
        <option value={ALL_VALUE}>Tous</option>
        {ENVIRONMENT_OPTIONS.map((env) => (
          <option key={env} value={env}>
            {env}
          </option>
        ))}
      </select>
    </div>
  );
}
