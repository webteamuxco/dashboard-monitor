import type { VisitorsTimeSeriesPoint } from "../domain/VisitorsTimeSeriesPoint";

export interface TrackerMonitorStrategyInterface {
  getActiveUsersTimeline(
    projectId: string,
    windowMinutes: number,
  ): Promise<VisitorsTimeSeriesPoint[]>;
  // Unique visitors over everything the provider still holds — the unwindowed
  // counterpart of the timeline, for a KPI that reads a total rather than a
  // rate. Bounded in practice by the provider's own retention, not by us.
  getTotalVisitors(projectId: string): Promise<number>;
}
