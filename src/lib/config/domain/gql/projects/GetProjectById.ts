import { GraphQlQuery } from "@/lib/shared/domain/GraphqlQuery";

export function getProjectByIdQuery(projectId: string): GraphQlQuery {
    return {
        query: `query GetProjects($documentId: ID!) {
                project(documentId: $documentId) {
                    documentId,
                    slug
                    mapped_tools {
                    documentId
                    name
                        strategies {
                            name
                        }
                    }
                    tool_configuration {
                    __typename
                    ... on ComponentConfigGlitchtipConfiguration {
                        id
                        url
                        projectId
                        organization
                        tool {
                            name
                        }
                    }
                    ... on ComponentConfigPosthogConfiguration {
                            id
                            url
                            projectId
                        }
                    }
                    default_config {
                        DefaultRefreshIntervalMS
                    }
                    timeInterval {
                        duration
                        interval
                    }
                }
            }`,
        variables: { documentId: projectId },
    };
}
