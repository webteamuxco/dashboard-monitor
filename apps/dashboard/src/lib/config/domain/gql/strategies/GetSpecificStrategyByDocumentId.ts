import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getSpecificStrategyByDocumentIdQuery(
    documentId: string,
    strategyName: string,
    toolSlug?: string | null,
): GraphQlQuery {
    return {
        query: gql`
            query GetStrategyById(
                $strategyNameFilter: StrategyFiltersInput
                $pagination: PaginationArg
            ) {
                strategies(filters: $strategyNameFilter, pagination: $pagination) {
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
                name: { eq: strategyName },
                mapped_tool: {
                    projects: { documentId: { eq: documentId } },
                    ...(toolSlug !== null && {
                        tool: { slug: { eq: toolSlug } },
                    }),
                },
            },
            pagination: { limit: 1 },
        },
    };
}
