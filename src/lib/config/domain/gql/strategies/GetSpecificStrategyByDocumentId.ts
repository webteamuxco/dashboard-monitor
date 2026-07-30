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
                        mapped_tool {
                        projects(filters: $projectDocumentId) {
                            documentId
                        }
                        }
                        tool {
                        slug
                        name
                        }
                        name
                    }
                }`,
        variables: {
                "strategyNameFilter": {
                    "name": {
                        "eq": strategyName
                    },
                    "tool": {
                        "slug": {
                            "eq": toolSlug
                        }
                    },
                    "mapped_tool": {
                    "projects": {
                        "documentId": {
                        "eq": documentId
                        }
                    }
                    }
                },
                "pagination": {
                    "limit": 1
                }
            }
    };
}
