"use client";

import { KpiCard } from "@/app/features/dashboard/ui/KpiCard";
import { useDashboardWindow } from "@/app/features/dashboard/state/useDashboardWindow";
import { useReservations } from "../hooks/useReservations";

interface ReservationsKpiCardProps {
  projectId: string;
  intervalMs: number;
}

export function ReservationsKpiCard({ projectId, intervalMs }: ReservationsKpiCardProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const { data, isPending } = useReservations(projectId, windowMinutes, intervalMs);

  const lastCount = data?.length ? data[data.length - 1].count : 0;
  const value = isPending && !data ? "—" : lastCount;

  return (
    <KpiCard
      label="RÉSERVATIONS/MIN"
      value={value}
      subtitle="débit courant"
      accent="blue"
    />
  );
}
