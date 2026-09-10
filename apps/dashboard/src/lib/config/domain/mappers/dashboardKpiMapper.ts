import { DashboardKpiDto } from "../dto/StrapiDashboardKpi";
import { DashboardKpi } from "../DashboardKpi";
import { mapMonitorStrategy } from "./monitorStrategyMapper";

export function mapDashboardKpi(dto: DashboardKpiDto): DashboardKpi {
    return {
        name: dto.name,
        title: dto.title,
        description: dto.description,
        icon: dto.icon,
        slug: dto.slug,
        id: dto.documentId,
        level: dto.level,
        order: dto.order,
        type: dto.type,
        strategy: mapMonitorStrategy(dto.strategy),
    };
}
