import type { VisitorsTimeSeriesPoint } from "../../../domain/VisitorsTimeSeriesPoint";
import type { PostHogQueryResponseDto } from "../dto/PostHogQueryResponse";

const MINUTE_MS = 60_000;
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

function buildEmptySeries(now: Date, windowMinutes: number): VisitorsTimeSeriesPoint[] {
  const startMinute = Math.floor((now.getTime() - (windowMinutes - 1) * MINUTE_MS) / MINUTE_MS);
  return Array.from({ length: windowMinutes }, (_, i) => {
    const ts = (startMinute + i) * MINUTE_MS;
    const d = new Date(ts);
    return {
      minuteIso: d.toISOString(),
      label: formatHourMinute(d),
      newCount: 0,
      returningCount: 0,
    };
  });
}

function parseMinuteIso(raw: number | string | null): string | null {
  if (raw == null) return null;
  const asNumber = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(asNumber)) {
    const ms = asNumber > 1e12 ? asNumber : asNumber * 1000;
    return new Date(Math.floor(ms / MINUTE_MS) * MINUTE_MS).toISOString();
  }
  const parsed = new Date(typeof raw === "string" ? raw : String(raw));
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Math.floor(parsed.getTime() / MINUTE_MS) * MINUTE_MS).toISOString();
}

function toCount(raw: number | string | null | undefined): number {
  if (raw == null) return 0;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function mapPostHogVisitorsTimeline(
  dto: PostHogQueryResponseDto,
  windowMinutes: number,
  now: Date = new Date(),
): VisitorsTimeSeriesPoint[] {
  const series = buildEmptySeries(now, windowMinutes);
  const indexByMinute = new Map(series.map((p, i) => [p.minuteIso, i]));

  for (const row of dto.results ?? []) {
    const minuteIso = parseMinuteIso(row?.[0] ?? null);
    if (!minuteIso) continue;
    const idx = indexByMinute.get(minuteIso);
    if (idx === undefined) continue;
    series[idx].newCount = toCount(row[1]);
    series[idx].returningCount = toCount(row[2]);
  }

  return series;
}
