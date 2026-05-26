import type { Log, LogFilters } from "../domain/Log";
import type { Period } from "@/lib/shared/domain/Period";

export interface LogMonitorStrategyInterface {
  getLogs(projectId: string, filters?: LogFilters, period?: Period): Promise<Log[]>;
}
