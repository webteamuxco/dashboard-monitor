import "server-only";
import { cache } from "react";
import {
  DashboardElementKind,
  loadToolWiring,
} from "@/lib/config/domain/loadToolWiring";
import { LOG_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";
import { BlockMeasure } from "@/lib/shared/domain/BlockMeasure";
import { resolveMonitorFactory } from "@/lib/shared/factory/MonitorFactoryResolver";

const fetchMeasure = cache(
  async (
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number | null,
    environment: string | null,
    limit: number | null,
    tagId: string | null = null,
  ): Promise<BlockMeasure> => {
    const wiring = await loadToolWiring(kind, documentId);
    const strategy = wiring.strategy;

    if (!strategy) {
      throw new Error(
        `Strapi ${kind} "${documentId}" declares no strategy. Map one in admin.`,
      );
    }

    const factory = resolveMonitorFactory(wiring);
    const connection = factory.createConnection();
    const monitor = factory.createStrategy(connection);

    if (strategy.kind === LOG_MONITOR_STRATEGY_ENUM) {
      return monitor.getBlockMeasures(windowMinutes, environment, limit, tagId)
    }

    return monitor.getBlockMeasures(windowMinutes, environment, limit)
  },
);

export class BlocksDataAccess {
  getMeasure(
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number | null,
    environment: string | null = null,
    limit: number | null = null,
    tagId: string | null = null,
  ): Promise<BlockMeasure> {
    return fetchMeasure(
      kind,
      documentId,
      windowMinutes,
      environment,
      limit,
      tagId,
    );
  }
}

export const blocksDataAccess = new BlocksDataAccess();
