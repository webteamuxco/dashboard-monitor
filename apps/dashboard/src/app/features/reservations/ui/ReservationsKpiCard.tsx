"use client";

import { KpiCard } from "@/app/features/dashboard/ui/KpiCard";
import {
  formatWindowLabel,
  useDashboardWindow,
} from "@/app/features/dashboard/state/useDashboardWindow";
import { useEnvironment } from "@/app/features/dashboard/state/useEnvironment";
import { useReservations } from "../hooks/useReservations";
import { CalendarCheck } from "lucide-react";

interface ReservationsKpiCardProps {
  documentId: string;
  intervalMs: number;
}

export function ReservationsKpiCard({ documentId, intervalMs }: ReservationsKpiCardProps) {
  const windowMinutes = useDashboardWindow((s) => s.windowMinutes);
  const environment = useEnvironment((s) => s.environment);
  const { data } = useReservations(documentId, windowMinutes, environment, intervalMs);

  const sum = data?.reduce((acc, p) => acc + p.count, 0);
  const value = data === undefined ? "—" : (sum ?? 0);

  return (
    <KpiCard
      label="RÉSERVATIONS"
      value={value}
      subtitle={`fenêtre ${formatWindowLabel(windowMinutes)}`}
      accent="blue"
      icon={<CalendarCheck className="text-primary h-4.5 w-4.5" />}
    />
  );
}
