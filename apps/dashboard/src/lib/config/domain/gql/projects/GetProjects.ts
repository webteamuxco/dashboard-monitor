import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getProjectsQuery(): GraphQlQuery {
    return {
        query: gql`
            query GetProjects {
                projects(sort: "order") {
                    documentId
                    publishedAt
                    title
                    updatedAt
                    slug
                }
            }
        `,
    };
}
