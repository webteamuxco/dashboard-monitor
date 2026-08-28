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

  public getBaseUrl(): string {
    return this.baseUrl
  }

  public getToken(): string {
    return this.token
  }
}