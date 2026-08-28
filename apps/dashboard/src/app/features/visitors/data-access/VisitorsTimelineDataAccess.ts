import "server-only";
import { getTrackerMonitor } from "@/lib/trackerMonitor/GetTrackerMonitor";
import type { VisitorPoint } from "../domain/VisitorPoint";

const fetchTimeline = async (
  documentId: string,
  windowMinutes: number,
): Promise<VisitorPoint[]> => {
  const trackerMonitorFactory = await getTrackerMonitor(documentId)
  const connection = await trackerMonitorFactory.createConnection(documentId)
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
  getSeries(documentId: string, windowMinutes: number): Promise<VisitorPoint[]> {
    return fetchTimeline(documentId, windowMinutes);
  }
}

export const visitorsTimelineDataAccess = new VisitorsTimelineDataAccess();
