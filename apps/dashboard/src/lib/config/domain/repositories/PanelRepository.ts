import { DashboardPanel } from "../DashboardPanels";
import { DashboardPanelDto } from "../dto/StrapiProject";
import { getPanelsByProjectIdQuery } from "../gql/panels/GetPanelsByProjectId";
import { mapDashboardPanel } from "../mappers/projectMapper";
import { AbstractStrapiRepository } from "./AbstractStrapiRepository";

export class PanelRepository extends AbstractStrapiRepository {

    async getProjectPanels(
        documentId: string,
        showDevelopmentPanel: boolean
    ): Promise<DashboardPanel[] | null> {
        const body = await this.execute<{ dashboardPanels: DashboardPanelDto[] }>(
            getPanelsByProjectIdQuery(documentId, showDevelopmentPanel),
        );

        if (!body.dashboardPanels.length) {
            return null
        }

        return body.dashboardPanels.map(mapDashboardPanel);
    }
}
