import { DashboardBlockType } from "../DashboardBlock";
import { Level } from "../Level";
import { StrategyDto } from "./StrapiStrategy";

export interface DashboardBlockDto {
    name: string;
    documentId: string;
    icon: string;
    slug: string;
    title: string
    description: string
    level: Level | null
    order: number
    type: DashboardBlockType | null
    strategy: (StrategyDto | null)[]
}
