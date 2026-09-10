import { DashboardBlocksFilters } from "@/app/api/config/dashboard-blocks/filters";
import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getDashboardBlocksQuery(
    fliters: DashboardBlocksFilters,
): GraphQlQuery {
    return {
        query: gql`
            query DashboardBlocks($dashboardBlockFilters: DashboardBlockFiltersInput) {
                dashboardBlocks(filters: $dashboardBlockFilters, sort: "order") {
                    description
                    documentId
                    icon
                    name
                    slug
                    title
                    level
                    order
                    type
                    strategy {
                        __typename
                        ... on ComponentStrategyTrackerMonitor {
                            id
                        }
                        ... on ComponentStrategyLogMonitor {
                            id
                            tags {
                                id
                                value
                                name
                                description
                            }
                        }
                        ... on ComponentStrategyErrorMonitor {
                            id
                        }
                        ... on Error {
                            code
                            message
                        }
                    }
                }
            }
        `,
        variables: {
            dashboardBlockFilters: {
                ...(fliters.panelSlug
                    ? {
                        dashboard_panels: {
                            slug: {
                                eq: fliters.panelSlug,
                            }
                        },
                    } : {}),
            },
        },
    };
}
