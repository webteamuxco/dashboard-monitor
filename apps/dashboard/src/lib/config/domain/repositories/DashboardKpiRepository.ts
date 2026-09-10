import { DashboardKpiFilters } from "@/app/api/config/dashboard-kpis/filters";
import { AbstractStrapiRepository } from "./AbstractStrapiRepository";
import { DashboardKpi } from "../DashboardKpi";
import { ToolWiring } from "../ToolWiring";
import { mapDashboardKpi } from "../mappers/dashboardKpiMapper";
import { mapToolWiring } from "../mappers/toolWiringMapper";
import { DashboardKpiDto } from "../dto/StrapiDashboardKpi";
import { ToolWiringDto } from "../dto/StrapiTool";
import { getDashboardKpisQuery } from "../gql/kpis/GetDashboardKpis";
import { getDashboardKpiByIdQuery } from "../gql/kpis/GetDashboardKpiById";

export class DashboardKpiRepository extends AbstractStrapiRepository {

        async getDashboardKpi(filters: DashboardKpiFilters): Promise<DashboardKpi[]> {
            const body = await this.execute<{ dashboardKpis: DashboardKpiDto[] }>(
                getDashboardKpisQuery(filters),
            );

            return body.dashboardKpis.map(mapDashboardKpi);
        }

        async getKpiWiring(kpiId: string): Promise<ToolWiring | null> {
            const body = await this.execute<{ dashboardKpi: ToolWiringDto | null }>(
                getDashboardKpiByIdQuery(kpiId),
            );

            return body.dashboardKpi ? mapToolWiring(body.dashboardKpi) : null;
        }
}
