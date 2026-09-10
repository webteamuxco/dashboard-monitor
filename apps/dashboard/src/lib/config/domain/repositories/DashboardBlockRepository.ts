import { AbstractStrapiRepository } from "./AbstractStrapiRepository";
import { ToolWiring } from "../ToolWiring";
import { mapToolWiring } from "../mappers/toolWiringMapper";
import { ToolWiringDto } from "../dto/StrapiTool";
import { getDashboardBlockByIdQuery } from "../gql/blocks/GetDashboardBlockById";
import { DashboardBlocksFilters } from "@/app/api/config/dashboard-blocks/filters";
import { DashboardBlock } from "../DashboardBlock";
import { DashboardBlockDto } from "../dto/StrapiDashboardBlock";
import { mapDashboardBlock } from "../mappers/dashboardBlockMapper";
import { getDashboardBlocksQuery } from "../gql/blocks/GetDashboardBlocks";

export class DashboardBlockRepository extends AbstractStrapiRepository {

        async getDashboardBlocks(filters: DashboardBlocksFilters): Promise<DashboardBlock[]> {
            const body = await this.execute<{ dashboardBlocks: DashboardBlockDto[] }>(
                getDashboardBlocksQuery(filters),
            );

            return body.dashboardBlocks.map(mapDashboardBlock);
        }

        async getBlockWiring(blockId: string): Promise<ToolWiring | null> {
            const body = await this.execute<{ dashboardBlock: ToolWiringDto | null }>(
                getDashboardBlockByIdQuery(blockId),
            );

            return body.dashboardBlock ? mapToolWiring(body.dashboardBlock) : null;
        }
}
