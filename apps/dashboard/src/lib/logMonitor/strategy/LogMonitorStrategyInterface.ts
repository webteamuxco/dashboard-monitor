import type { Log, LogFilters } from "../domain/Log";
import type { Period } from "@/lib/shared/domain/Period";
import { StrategyInterface } from "@/lib/shared/factory/StrategyInterace";

export interface LogMonitorStrategyInterface extends StrategyInterface {
  getLogs(
    projectId: string,
    filters?: LogFilters,
    period?: Period): Promise<Log[]>;
}
