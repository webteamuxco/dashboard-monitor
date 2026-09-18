import "server-only";
import { cache } from "react";
import {
  DashboardElementKind,
  loadToolWiring,
} from "@/lib/config/domain/loadToolWiring";
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
    showResolved = false,
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
    

    return monitor.getBlockMeasures(windowMinutes, environment, limit, {
      tagId,
      showResolved,
    })
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
    showResolved = false,
  ): Promise<BlockMeasure> {
    return fetchMeasure(
      kind,
      documentId,
      windowMinutes,
      environment,
      limit,
      tagId,
      showResolved,
    );
  }
}

export const blocksDataAccess = new BlocksDataAccess();
