import { DashboardKpiFilters } from "@/app/api/config/dashboard-kpis/filters";
import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getDashboardKpisQuery(
    fliters: DashboardKpiFilters,
): GraphQlQuery {
    return {
        query: gql`
            query DashboardKpis($dashboardKpiFilters: DashboardKpiFiltersInput) {
                dashboardKpis(filters: $dashboardKpiFilters, sort: "order") {
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
            dashboardKpiFilters: {
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
