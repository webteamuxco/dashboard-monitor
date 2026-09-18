import { BlockMeasure, BlockMeasureOptions } from "@/lib/shared/domain/BlockMeasure";
import { KpiMeasure } from "../domain/KpiMeasure";

export interface StrategyInterface {
  getKpiMeasures(windowMinutes: number | null, environment: string | null): Promise<KpiMeasure>
  getBlockMeasures(windowMinutes: number | null, environment: string | null, limit: number | null, options?: BlockMeasureOptions): Promise<BlockMeasure>
}
