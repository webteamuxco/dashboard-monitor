import "server-only";
import { getTrackerMonitor } from "@/lib/trackerMonitor/GetTrackerMonitor";
import type { VisitorPoint } from "../domain/VisitorPoint";

const fetchTimeline = 
  async (projectId: string, windowMinutes: number): Promise<VisitorPoint[]> => {
    const points = await getTrackerMonitor().getActiveUsersTimeline(projectId, windowMinutes);
    return points.map((p) => ({
      minuteIso: p.minuteIso,
      label: p.label,
      newCount: p.newCount,
      returningCount: p.returningCount,
    }));
  }
;

export class VisitorsTimelineDataAccess {
  getSeries(projectId: string, windowMinutes: number): Promise<VisitorPoint[]> {
    return fetchTimeline(projectId, windowMinutes);
  }
}

export const visitorsTimelineDataAccess = new VisitorsTimelineDataAccess();
