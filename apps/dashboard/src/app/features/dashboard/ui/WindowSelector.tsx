"use client";

import { cn } from "@/lib/utils";
import {
  WINDOW_PRESETS,
  useDashboardWindow,
} from "../state/useDashboardWindow";

export function WindowSelector() {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const setWindowMinutes = useDashboardWindow((s) => s.setWindowMinutes);

  return (
    <div
      role="radiogroup"
      aria-label="Fenêtre temporelle"
      className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5 font-mono text-[0.6875rem]"
    >
      {WINDOW_PRESETS.map((preset) => {
        const active = preset.minutes === windowMinutes;
        return (
          <button
            key={preset.minutes}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setWindowMinutes(preset.minutes)}
            className={cn(
              "rounded px-2 py-0.5 transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
