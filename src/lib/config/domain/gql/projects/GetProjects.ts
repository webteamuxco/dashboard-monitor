import { GraphQlQuery } from "@/lib/shared/domain/GraphqlQuery";

export function getProjectsQuery(): GraphQlQuery {

    const fields = ["documentId", "publishedAt", "title", "updatedAt", "slug"];

    return {
        query: `query GetProjects { projects { ${fields.join(" ")} } }`
    };
}