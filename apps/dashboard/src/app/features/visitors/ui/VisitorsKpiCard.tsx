"use client";

import { KpiCard } from "@/app/features/dashboard/ui/KpiCard";
import {
  formatWindowLabel,
  useDashboardWindow,
} from "@/app/features/dashboard/state/useDashboardWindow";
import { useVisitorsTimeline } from "../hooks/useVisitorsTimeline";

type Variant = "new" | "returning";

interface VisitorsKpiCardProps {
  documentId: string;
  intervalMs: number;
  variant: Variant;
}

const LABELS: Record<Variant, string> = {
  new: "NOUVEAUX",
  returning: "DE RETOUR",
};

const ACCENT: Record<Variant, "green" | "blue"> = {
  new: "green",
  returning: "blue",
};

export function VisitorsKpiCard({
  documentId,
  intervalMs,
  variant,
}: VisitorsKpiCardProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const { data } = useVisitorsTimeline(documentId, windowMinutes, intervalMs);

  const sum = data?.reduce(
    (acc, p) => acc + (variant === "new" ? p.newCount : p.returningCount),
    0,
  );
  const value = data === undefined ? "—" : (sum ?? 0);

  return (
    <KpiCard
      label={LABELS[variant]}
      value={value}
      subtitle={`fenêtre ${formatWindowLabel(windowMinutes)}`}
      accent={ACCENT[variant]}
    />
  );
}
