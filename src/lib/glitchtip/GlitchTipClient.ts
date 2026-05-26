import "server-only";

export interface GlitchTipClientConfig {
  baseUrl: string;
  token: string;
}

export class GlitchTipClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: GlitchTipClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
  }

  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

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
        `GlitchTip API error ${response.status} on ${path}: ${body.slice(0, 200)}`,
      );
    }

    return (await response.json()) as T;
  }
}
