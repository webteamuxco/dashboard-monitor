import "server-only";

export interface StrapiClientConfig {
  baseUrl: string;
  token: string;
}

export class StrapiClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: StrapiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
  }

  async get<T>(path: string, params?: URLSearchParams): Promise<T> {
    const qs = params?.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Strapi API error ${response.status} on ${path}: ${body.slice(0, 200)}`,
      );
    }

    return (await response.json()) as T;
  }
}
