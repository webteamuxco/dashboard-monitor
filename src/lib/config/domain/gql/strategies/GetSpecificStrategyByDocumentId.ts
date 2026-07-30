import { GraphQlQuery } from "@/lib/shared/domain/GraphqlQuery";

export function getSpecificStrategyByDocumentIdQuery(
    documentId: string,
    strategyName: string,
    toolSlug: string,
    limit?: number
):  GraphQlQuery {

    limit ?? 1 

    return {
        query: `query GetStrategyById($projectDocumentId: ProjectFiltersInput, $strategyNameFilter: StrategyFiltersInput, $pagination: PaginationArg) {
                    strategies(filters: $strategyNameFilter, pagination: $pagination) {
                        name
                        mapped_tool {
                            projects(filters: $projectDocumentId) {
                                documentId
                            }
                        }
                        tool {
                            slug
                            name
                        }
                    }
                }
                    `,
        variables: {
            "projectDocumentId": {
                "documentId": {
                    "eq": documentId
                }
            },
            "strategyNameFilter": {
                "name": {
                    "eq": strategyName
                },
                "tool": {
                    "slug": {
                        "eq": toolSlug
                    }
                }
            },
            "pagination": {
                "limit": limit ?? 1
            }
        }
    };
}
