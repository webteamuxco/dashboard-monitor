import "server-only";
import { GraphQlQuery } from "@/lib/shared/domain/GraphqlQuery";
import { StrapiClient } from "../StrapiClient";

interface GraphQlResponse<T> {
    data?: T;
    errors?: { message: string }[];
}

export abstract class AbstractStrapiRepository {

    constructor(private readonly client: StrapiClient) {}


    protected async execute<T>(gql: GraphQlQuery): Promise<T> {
        const endpoint = `${this.client.getBaseUrl()}/graphql`;

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${this.client.getToken()}`,
            },
            body: JSON.stringify(gql),
        });

        if (!response.ok) {
            // Strapi answers 405 to a POST on any path that is not the GraphQL
            // endpoint, so the URL belongs in the message: it is the only way to
            // tell a misconfigured STRAPI_BASE_URL from a Strapi-side failure.
            throw new Error(
                `Strapi request failed: ${response.status} ${response.statusText} on ${endpoint}`,
            );
        }

        const payload = (await response.json()) as GraphQlResponse<T>;

        if (payload.errors?.length) {
            throw new Error(
                `Strapi GraphQL error: ${payload.errors
                    .map((error) => error.message)
                    .join("; ")}`,
            );
        }

        if (!payload.data) {
            throw new Error("Strapi GraphQL response missing data");
        }

        return payload.data;
    }
}
