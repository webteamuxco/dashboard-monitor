import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getDashboardKpiByIdQuery(documentId: string): GraphQlQuery {
    return {
        query: gql`
            query DashboardKpiWiring($documentId: ID!) {
                dashboardKpi(documentId: $documentId) {
                    documentId
                    strategy {
                        __typename
                        ... on ComponentStrategyErrorMonitor {
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
                        ... on ComponentStrategyTrackerMonitor {
                            id
                        }
                        ... on Error {
                            code
                            message
                        }
                    }
                    tool {
                        documentId
                        name
                        slug
                        configuration {
                            __typename
                            ... on ComponentConfigGlitchtipConfiguration {
                                id
                                url
                                projectId
                                organization
                            }
                            ... on ComponentConfigPosthogConfiguration {
                                id
                                url
                                projectId
                            }
                            ... on Error {
                                code
                                message
                            }
                        }
                    }
                }
            }
        `,
        variables: { documentId: documentId },
    };
}
