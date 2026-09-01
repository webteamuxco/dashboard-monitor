import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getProjectByIdQuery(projectId: string): GraphQlQuery {
    return {
        query: gql`
            query GetProjectById($documentId: ID!) {
                project(documentId: $documentId) {
                    documentId
                        slug
                        title
                        createdAt
                        updatedAt
                        publishedAt
                        dashboard_panels {
                        tool_configuration {
                            ... on ComponentConfigGlitchtipConfiguration {
                            tool {
                                slug
                            }
                            url
                            projectId
                            organization
                            id
                            }
                            ... on ComponentConfigPosthogConfiguration {
                            url
                            projectId
                            id
                            }
                        }
                        mapped_tools {
                            documentId
                            name
                            strategies {
                            name
                            }
                        }
                        }
                        default_config {
                        DefaultRefreshIntervalMS
                        }
                }
            }
        `,
        variables: { documentId: projectId },
    };
}
