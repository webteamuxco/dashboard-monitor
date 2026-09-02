import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getStrategiesByDocumentId(
    documentId: string,
    pannelSlug?: string | null,
): GraphQlQuery {
    return {
        query: gql`
            query GetStrategiesByDocumentId(
                $filters: StrategyFiltersInput
            ) {
                strategies(filters: $filters) {
                    name
                }
            }
        `,
        variables: {
            filters: {
                mapped_tool: {
                    dashboard_panels: {
                        slug: {
                            eq: pannelSlug,
                        },
                        project: {
                            documentId: {
                                eq: documentId,
                            },
                        },
                    },
                },
            },
        },
    };
}
