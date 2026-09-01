import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getPanelsByProjectIdQuery(
    projectId: string,
): GraphQlQuery {
    return {
        query: gql`
            query GetDashboardPanelsByDocumentId($panelProjectFilters: DashboardPanelFiltersInput) {
            dashboardPanels(filters: $panelProjectFilters, sort: "order") {
                documentId
                icon
                name
                slug
                display_name
                order
            }
            }
        `,
        variables: {
            panelProjectFilters: {
                project: {
                    documentId: {  eq: projectId  },
                },
            },
        },
    };
}
