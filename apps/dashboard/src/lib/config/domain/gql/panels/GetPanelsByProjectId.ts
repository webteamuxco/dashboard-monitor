import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getPanelsByProjectIdQuery(
    projectId: string,
    showDevelopmentPanel: boolean
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
                is_development
            }
            }
        `,
        variables: {
            panelProjectFilters: {
                project: {
                    documentId: {  eq: projectId  },
                },
            ...(!showDevelopmentPanel
            ? {
                is_development: {
                    eq: false,
                },
              }: {}),
            },
        },
    };
}
