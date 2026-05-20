import "server-only";

export interface PostHogClientConfig {
  baseUrl: string;
  token: string;
  projectId: string;
}

export class PostHogClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly projectId: string;

  constructor(config: PostHogClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
    this.projectId = config.projectId;
  }

  async query<T>(hogQl: string): Promise<T> {
    const url = `${this.baseUrl}/api/projects/${this.projectId}/query/`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query: hogQl },
        refresh: "force_blocking",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `PostHog API error ${response.status} on /query/: ${body.slice(0, 200)}`,
      );
    }

    return (await response.json()) as T;
  }
}
