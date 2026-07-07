import "server-only";
import { cache } from "react";
import { getLogMonitor } from "@/lib/logMonitor/GetLogMonitor";
import type { Log } from "@/lib/logMonitor/domain/Log";
import type { Period } from "@/lib/shared/domain/Period";
import type { ReservationPoint } from "../domain/ReservationPoint";

const MINUTE_MS = 60_000;
const RESERVATION_TAG = "reservation.sent";
const DISPLAY_TIMEZONE = "Europe/Paris";

const minuteLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: DISPLAY_TIMEZONE,
});

function formatHourMinute(date: Date): string {
  return minuteLabelFormatter.format(date);
}

function buildEmptySeries(now: Date, windowMinutes: number): ReservationPoint[] {
  const startMinute = Math.floor((now.getTime() - (windowMinutes - 1) * MINUTE_MS) / MINUTE_MS);
  return Array.from({ length: windowMinutes }, (_, i) => {
    const ts = (startMinute + i) * MINUTE_MS;
    const d = new Date(ts);
    return {
      minuteIso: d.toISOString(),
      label: formatHourMinute(d),
      count: 0,
    };
  });
}

function aggregateByMinute(logs: Log[], series: ReservationPoint[]): ReservationPoint[] {
  const indexByMinute = new Map(series.map((p, i) => [p.minuteIso, i]));
  const counts = series.map((p) => p.count);

  for (const log of logs) {
    const ts = new Date(log.timestamp).getTime();
    const minuteIso = new Date(Math.floor(ts / MINUTE_MS) * MINUTE_MS).toISOString();
    const idx = indexByMinute.get(minuteIso);
    if (idx !== undefined) counts[idx]++;
  }

  return series.map((p, i) => ({ ...p, count: counts[i] }));
}

const fetchSeries = cache(
  async (
    projectId: string,
    windowMinutes: number,
    environment: string | null,
  ): Promise<ReservationPoint[]> => {
    const now = new Date();
    const period: Period = {
      from: new Date(now.getTime() - windowMinutes * MINUTE_MS).toISOString(),
      to: now.toISOString(),
      interval: "1m",
    };

    const query = environment ? `${RESERVATION_TAG}.${environment}` : RESERVATION_TAG;
    const logs = await getLogMonitor().getLogs(projectId, { query }, period);
    return aggregateByMinute(logs, buildEmptySeries(now, windowMinutes));
  },
);

export class ReservationsDataAccess {
  getSeries(
    projectId: string,
    windowMinutes: number,
    environment: string | null = null,
  ): Promise<ReservationPoint[]> {
    return fetchSeries(projectId, windowMinutes, environment);
  }
}

export const reservationsDataAccess = new ReservationsDataAccess();
