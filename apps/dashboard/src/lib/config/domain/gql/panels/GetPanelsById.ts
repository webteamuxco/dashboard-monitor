import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getPanelByIdQuery(
    documentId: string,
): GraphQlQuery {
    return {
        query: gql`
            query GetDashboardPanelsByDocumentId($documentId: ID!) {
                dashboardPanel(documentId: $documentId) {
                    documentId
                    icon
                    name
                    slug
                    display_name
                    order
                    tool_configuration {
                        __typename
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
            }
        `,
        variables: { documentId: documentId },
    };
}
