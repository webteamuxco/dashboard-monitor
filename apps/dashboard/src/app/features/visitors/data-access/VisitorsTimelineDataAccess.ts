import "server-only";
import { getTrackerMonitor } from "@/lib/trackerMonitor/GetTrackerMonitor";
import type { VisitorPoint } from "../domain/VisitorPoint";
import {
  DashboardElementKind,
  loadToolWiring,
} from "@/lib/config/domain/loadToolWiring";

const fetchTimeline = async (
  kind: DashboardElementKind,
  documentId: string,
  windowMinutes: number,
): Promise<VisitorPoint[]> => {
  const wiring = await loadToolWiring(kind, documentId);
  const trackerMonitorFactory = getTrackerMonitor(wiring)
  const connection = trackerMonitorFactory.createConnection(wiring)
  const strategy = trackerMonitorFactory.createStrategy(connection)

  const points = await strategy.getActiveUsersTimeline(
    connection.projectId,
    windowMinutes,
  );

  return points.map((p) => ({
    minuteIso: p.minuteIso,
    label: p.label,
    newCount: p.newCount,
    returningCount: p.returningCount,
  }));
};

export class VisitorsTimelineDataAccess {
  getSeries(
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number,
  ): Promise<VisitorPoint[]> {
    return fetchTimeline(kind, documentId, windowMinutes);
  }
}

export const visitorsTimelineDataAccess = new VisitorsTimelineDataAccess();
