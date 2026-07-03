"use client";

import { KpiCard } from "@/app/features/dashboard/ui/KpiCard";
import {
  formatWindowLabel,
  useDashboardWindow,
} from "@/app/features/dashboard/state/useDashboardWindow";
import { useEnvironment } from "@/app/features/dashboard/state/useEnvironment";
import { useReservations } from "../hooks/useReservations";

interface ReservationsKpiCardProps {
  projectId: string;
  intervalMs: number;
}

export function ReservationsKpiCard({ projectId, intervalMs }: ReservationsKpiCardProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const environment = useEnvironment((s) => s.environment);
  const { data } = useReservations(projectId, windowMinutes, environment, intervalMs);

  const sum = data?.reduce((acc, p) => acc + p.count, 0);
  const value = data === undefined ? "—" : (sum ?? 0);

  return (
    <KpiCard
      label="RÉSERVATIONS"
      value={value}
      subtitle={`fenêtre ${formatWindowLabel(windowMinutes)}`}
      accent="blue"
    />
  );
}
