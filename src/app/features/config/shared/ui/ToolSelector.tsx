"use client";

import type { MonitoringTool } from "../domain/DashboardConfig";

interface ToolSelectorProps {
  label: string;
  value: MonitoringTool | null;
  options: readonly MonitoringTool[];
  onChange: (tool: MonitoringTool | null) => void;
}

export function ToolSelector({ label, value, options, onChange }: ToolSelectorProps) {
  return (
    <label className="flex items-center gap-1.5 font-mono text-[0.6875rem] text-muted-foreground">
      <span>{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="h-7 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[0.6875rem] text-foreground outline-none focus:border-primary"
      >
        <option value="">—</option>
        {options.map((tool) => (
          <option key={tool} value={tool}>
            {tool}
          </option>
        ))}
      </select>
    </label>
  );
}
