import { GraphQlQuery, gql } from "@/lib/shared/domain/GraphqlQuery";

export function getProjectByIdQuery(projectId: string): GraphQlQuery {
    return {
        query: gql`
            query GetProjectById($documentId: ID!) {
                project(documentId: $documentId) {
                    documentId
                    slug
                    default_config {
                        DefaultRefreshIntervalMS
                    }
                    timeInterval {
                        duration
                        interval
                    }
                }
            }
        `,
        variables: { documentId: projectId },
    };
}
