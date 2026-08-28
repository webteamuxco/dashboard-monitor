import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getStrategiesByDocumentId(
    documentId: string,
): GraphQlQuery {
    return {
        query: gql`
            query GetStrategiesByDocumentId(
                $strategyNameFilter: StrategyFiltersInput
            ) {
                strategies(filters: $strategyNameFilter) {
                    mapped_tool {
                        projects {
                            documentId
                        }
                        tool {
                            slug
                            name
                        }
                    }
                    name
                }
            }
        `,
        variables: {
            strategyNameFilter: {
                mapped_tool: {
                    projects: { documentId: { eq: documentId } },
                },
            },
        },
    };
}
