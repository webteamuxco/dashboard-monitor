import { mapMonitorStrategy } from "./monitorStrategyMapper";
import { DashboardBlockDto } from "../dto/StrapiDashboardBlock";
import { DashboardBlock } from "../DashboardBlock";

export function mapDashboardBlock(dto: DashboardBlockDto): DashboardBlock {
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
