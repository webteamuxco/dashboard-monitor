import { DashboardKpiType } from "../DashboardKpi";
import { Level } from "../Level";
import { StrategyDto } from "./StrapiStrategy";

export interface DashboardKpiDto {
    name: string;
    documentId: string;
    icon: string;
    slug: string;
    title: string
    description: string
    level: Level
    order: number
    type: DashboardKpiType | null
    strategy: (StrategyDto | null)[]
}

export interface DashboardKpiDto {
    name: string;
    documentId: string;
    icon: string;
    slug: string;
    title: string
    description: string
    level: Level
    order: number
    type: DashboardKpiType | null
    strategy: (StrategyDto | null)[]
}
