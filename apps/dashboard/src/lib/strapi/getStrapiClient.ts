import "server-only";
import { StrapiClient } from "./StrapiClient";

let cached: StrapiClient | null = null;

export function getStrapiClient(): StrapiClient {
  if (cached) return cached;

  const baseUrl = process.env.STRAPI_BASE_URL;
  const token = process.env.STRAPI_API_TOKEN;

  const missing: string[] = [];
  if (!baseUrl) missing.push("STRAPI_BASE_URL");
  if (!token) missing.push("STRAPI_API_TOKEN");
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}.`);
  }

  cached = new StrapiClient({ baseUrl: baseUrl!, token: token! });
  return cached;
}
