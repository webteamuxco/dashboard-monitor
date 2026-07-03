import "server-only";
import { cache } from "react";
import { getErrorMonitor } from "@/lib/errorMonitor/GetErrorMonitor";
import type { Period } from "@/lib/shared/domain/Period";
import type { ErrorRatePoint } from "../domain/ErrorRatePoint";

const HOUR_MS = 3_600_000;
const PAST_HOURS = 24;
const DISPLAY_TIMEZONE = "Europe/Paris";

const hourLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: DISPLAY_TIMEZONE,
});

function formatHourLabel(date: Date): string {
  const hourPart = hourLabelFormatter
    .formatToParts(date)
    .find((p) => p.type === "hour")?.value ?? "00";
  return `${hourPart}h`;
}

function toPoint(timestamp: string | Date, count: number | null): ErrorRatePoint {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return {
    bucketEpoch: date.getTime(),
    label: formatHourLabel(date),
    count,
  };
}

const fetchSeries = cache(
  async (projectId: string, environment: string | null): Promise<ErrorRatePoint[]> => {
    const now = new Date();
    const period: Period = {
      from: new Date(now.getTime() - PAST_HOURS * HOUR_MS).toISOString(),
      to: now.toISOString(),
      interval: "1h",
    };

    const points = await getErrorMonitor().getErrorStats(
      projectId,
      period,
      environment ?? undefined,
    );
    return points.map((p) => toPoint(p.timestamp, p.count));
  },
);

export class ErrorRateDataAccess {
  getSeries(projectId: string, environment: string | null = null): Promise<ErrorRatePoint[]> {
    return fetchSeries(projectId, environment);
  }
}

export const errorRateDataAccess = new ErrorRateDataAccess();
