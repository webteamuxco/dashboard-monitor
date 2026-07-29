import "server-only";

export interface GlitchTipClientConfig {
  baseUrl: string;
  token: string;
}

type QueryParams = Record<string, string | number | undefined>;

export interface PaginateOptions {
  // Stop once this many items have been collected across pages (honours an
  // explicit caller limit that can span more than one page).
  maxItems?: number;
  // Safety backstop against a server that never stops advertising a next page.
  maxPages?: number;
}

const DEFAULT_MAX_PAGES = 50;

// GlitchTip/Sentry list endpoints paginate via the `Link` response header:
//   <url?cursor=…>; rel="next"; results="true"; cursor="…"
// `results="false"` on the next link means the current page is the last one.
function parseNextCursor(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;
  for (const part of linkHeader.split(",")) {
    const segments = part.split(";").map((s) => s.trim());
    const rel = segments.find((s) => s.startsWith("rel="))?.slice(4).replace(/"/g, "");
    if (rel !== "next") continue;
    const results = segments.find((s) => s.startsWith("results="))?.slice(8).replace(/"/g, "");
    if (results === "false") continue;
    return segments.find((s) => s.startsWith("cursor="))?.slice(7).replace(/"/g, "");
  }
  return undefined;
}

export class GlitchTipClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: GlitchTipClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
  }

  private async request(path: string, query?: QueryParams): Promise<Response> {
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

    return response;
  }

  async get<T>(path: string, query?: QueryParams): Promise<T> {
    const response = await this.request(path, query);
    return (await response.json()) as T;
  }

  // Follows the cursor pagination of a list endpoint and returns every item.
  // Use for feeds where the caller expects the full result set — a plain `get`
  // silently caps at GlitchTip's default page size (100).
  async getPaginated<TItem>(
    path: string,
    query?: QueryParams,
    options?: PaginateOptions,
  ): Promise<TItem[]> {
    const maxItems = options?.maxItems ?? Infinity;
    const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;

    const items: TItem[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const response = await this.request(path, { ...query, cursor });
      const pageItems = (await response.json()) as TItem[];
      items.push(...pageItems);

      if (items.length >= maxItems) return items.slice(0, maxItems);

      cursor = parseNextCursor(response.headers.get("Link"));
      if (!cursor) break;
    }

    return items;
  }
}
