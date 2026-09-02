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
        strategies(
          filters: $strategyNameFilter
          pagination: $pagination
        ) {
          name
        }
      }
    `,
    variables: {
      strategyNameFilter: {
        name: {
          eq: strategyName,
        },
        mapped_tool: {
          dashboard_panels: {
              documentId: {
                eq: documentId,
            },
          },
          ...(toolSlug
            ? {
                tool: {
                  slug: {
                    eq: toolSlug,
                  },
                },
              }
            : {}),
        },
      },
      pagination: {
        limit: 1,
      },
    },
  };
}
