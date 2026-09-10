import { Level } from "@/lib/config/domain/Level";
import { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";

export type BlockAccent = Level;

export const ACCENT_BAR: Record<BlockAccent, string> = {
  emergency: "bg-level-emergency",
  alert: "bg-level-alert",
  critical: "bg-level-critical",
  error: "bg-level-fatal",
  warning: "bg-level-warning",
  notice: "bg-status-live",
  info: "bg-primary",
  international: "bg-level-international",
  debug: "bg-level-debug",
  trace: "bg-level-trace"
};

export const ACCENT_VALUE: Record<BlockAccent, string> = {
  emergency: "text-level-emergency",
  alert: "text-level-alert",
  critical: "text-level-critical",
  error: "text-level-fatal",
  warning: "text-level-warning",
  notice: "text-status-live",
  info: "text-primary",
  international: "text-level-international",
  debug: "text-level-debug",
  trace: "text-level-trace"
};

export const ACCENT_CHART: Record<BlockAccent, string> = {
  emergency: "var(--level-emergency)",
  alert: "var(--level-alert)",
  critical: "var(--level-critical)",
  error: "var(--level-fatal)",
  warning: "var(--level-warning)",
  notice: "var(--status-live)",
  info: "var(--primary)",
  international: "var(--level-international)",
  debug: "var(--level-debug)",
  trace: "var(--level-trace)"
};

// A second curve (the tracker's returning visitors) has no level of its own:
// only the first one inherits the block's accent.
export const SECONDARY_SERIES_COLORS = [
  "var(--level-info)",
  "var(--level-international)",
  "var(--level-warning)",
];

export const LEVEL_VARIANT: Record<ErrorLevel, "fatal" | "error" | "warning" | "info" | "debug"> = {
  fatal: "fatal",
  error: "error",
  warning: "warning",
  info: "info",
  debug: "debug",
};

export const LEVEL_ROW_CLASS: Record<ErrorLevel, string> = {
  fatal: "bg-level-fatal-bg",
  error: "bg-level-error-bg",
  warning: "",
  info: "",
  debug: "",
};