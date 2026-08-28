import { StrapiClient } from "./StrapiClient";
import { StrapiClientStrategy } from "./StrapiStrategy";

export class StrapiClientFactory {

    create(): StrapiClientStrategy {
        const baseUrl = process.env.STRAPI_BASE_URL;
        const token = process.env.STRAPI_TOKEN;

        if (!baseUrl || !token) {
            throw new Error(
                "Strapi env vars missing: STRAPI_BASE_URL, STRAPI_TOKEN, "
            );
        }

        const client = new StrapiClient({
            baseUrl: baseUrl,
            token: token
        })

        return new StrapiClientStrategy(client)
    }
}