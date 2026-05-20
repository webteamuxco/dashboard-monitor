import { cn } from "@/lib/utils";

type KpiAccent = "red" | "orange" | "green" | "blue";

const ACCENT_BAR: Record<KpiAccent, string> = {
  red: "bg-level-fatal",
  orange: "bg-level-warning",
  green: "bg-status-live",
  blue: "bg-primary",
};

const ACCENT_VALUE: Record<KpiAccent, string> = {
  red: "text-level-fatal",
  orange: "text-level-warning",
  green: "text-status-live",
  blue: "text-primary",
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  subtitle: string;
  accent: KpiAccent;
}

export function KpiCard({ label, value, subtitle, accent }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card px-4 py-3.5">
      <div className={cn("absolute inset-x-0 top-0 h-0.5", ACCENT_BAR[accent])} aria-hidden />
      <div className="mb-1.5 font-mono text-[11px] tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("font-mono text-3xl font-semibold leading-none", ACCENT_VALUE[accent])}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] text-muted-foreground/60">{subtitle}</div>
    </div>
  );
}
