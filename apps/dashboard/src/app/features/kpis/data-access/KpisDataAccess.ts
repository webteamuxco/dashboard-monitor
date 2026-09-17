import "server-only";
import { cache } from "react";
import {
  DashboardElementKind,
  loadToolWiring,
} from "@/lib/config/domain/loadToolWiring";
import { resolveMonitorFactory } from "@/lib/shared/factory/MonitorFactoryResolver";
import type { KpiMeasure } from "../../../../lib/shared/domain/KpiMeasure";

const fetchMeasure = cache(
  async (
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number | null,
    environment: string | null,
  ): Promise<KpiMeasure> => {
    const wiring = await loadToolWiring(kind, documentId);

    const factory = resolveMonitorFactory(wiring);
    const connection = factory.createConnection();
    const monitor = factory.createStrategy(connection);

    return monitor.getKpiMeasures(windowMinutes, environment);
  },
);

export class KpisDataAccess {
  getMeasure(
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number | null,
    environment: string | null = null,
  ): Promise<KpiMeasure> {
    return fetchMeasure(kind, documentId, windowMinutes, environment);
  }
}

export const kpisDataAccess = new KpisDataAccess();