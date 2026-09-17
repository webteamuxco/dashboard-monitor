import { BlockMeasure } from "@/lib/shared/domain/BlockMeasure";
import type { Log, LogFilters } from "../domain/Log";
import type { Period } from "@/lib/shared/domain/Period";
import { StrategyInterface } from "@/lib/shared/factory/StrategyInterace";

export interface LogMonitorStrategyInterface extends StrategyInterface {
  getLogs(
    projectId: string,
    filters?: LogFilters,
    period?: Period): Promise<Log[]>;
    
  getBlockMeasures(
    windowMinutes: number | null,
    environment: string | null,
    limit: number | null,
    tagId?: string | null,
  ): Promise<BlockMeasure>;
}
