import type { VisitorsTimeSeriesPoint } from "../domain/VisitorsTimeSeriesPoint";

export interface TrackerMonitorStrategyInterface {
  getActiveUsersTimeline(
    projectId: string,
    windowMinutes: number,
  ): Promise<VisitorsTimeSeriesPoint[]>;
}
