import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GlitchTipClient } from "@/lib/glitchtip/GlitchTipClient";

describe("GlitchTipClient.get", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function okJson(data: unknown): Response {
    return {
      ok: true,
      status: 200,
      json: async () => data,
    } as unknown as Response;
  }

  function notOk(status: number, body = ""): Response {
    return {
      ok: false,
      status,
      text: async () => body,
    } as unknown as Response;
  }

  it("builds the URL by concatenating baseUrl and path, no trailing slash", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com/", token: "tok" });

    await client.get("/api/0/health/");

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.toString()).toBe("https://gt.example.com/api/0/health/");
  });

  it("appends defined query params and skips undefined ones", async () => {
    fetchMock.mockResolvedValue(okJson([]));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "t" });

    await client.get("/api/0/x/", {
      project: "p1",
      limit: 10,
      missing: undefined,
    });

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.searchParams.get("project")).toBe("p1");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.has("missing")).toBe(false);
  });

  it("sends Bearer auth and Accept header, cache no-store", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "secret" });

    await client.get("/api/0/x/");

    const init = fetchMock.mock.calls[0][1];
    expect(init.headers).toEqual({
      Authorization: "Bearer secret",
      Accept: "application/json",
    });
    expect(init.cache).toBe("no-store");
  });

  it("returns the parsed JSON body on success", async () => {
    fetchMock.mockResolvedValue(okJson({ hello: "world" }));
    const client = new GlitchTipClient({ baseUrl: "https://x", token: "t" });

    expect(await client.get<{ hello: string }>("/p")).toEqual({ hello: "world" });
  });

  it("throws with status and path on non-2xx, embedding the response body (truncated)", async () => {
    fetchMock.mockResolvedValue(notOk(404, "the entity is missing"));
    const client = new GlitchTipClient({ baseUrl: "https://x", token: "t" });

    await expect(client.get("/missing/path")).rejects.toThrow(
      /GlitchTip API error 404 on \/missing\/path/,
    );
  });

  it("survives when the error body cannot be read", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => { throw new Error("stream"); },
    } as unknown as Response);
    const client = new GlitchTipClient({ baseUrl: "https://x", token: "t" });

    await expect(client.get("/x")).rejects.toThrow(/500 on \/x/);
  });
});

describe("GlitchTipClient.getPaginated", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function okJson(data: unknown, link: string | null = null): Response {
    return {
      ok: true,
      status: 200,
      json: async () => data,
      headers: { get: (name: string) => (name === "Link" ? link : null) },
    } as unknown as Response;
  }

  function nextLink(cursor: string, results = "true"): string {
    return `<https://gt.example.com/next>; rel="next"; results="${results}"; cursor="${cursor}"`;
  }

  it("returns a single page unchanged when there is no next link", async () => {
    fetchMock.mockResolvedValue(okJson([{ id: 1 }, { id: 2 }]));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "t" });

    expect(await client.getPaginated("/api/0/x/")).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows the Link cursor and concatenates every page", async () => {
    fetchMock
      .mockResolvedValueOnce(okJson([{ id: 1 }], nextLink("cur-2")))
      .mockResolvedValueOnce(okJson([{ id: 2 }], nextLink("cur-3")))
      .mockResolvedValueOnce(okJson([{ id: 3 }]));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "t" });

    expect(await client.getPaginated("/api/0/x/")).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[1][0] as URL).searchParams.get("cursor")).toBe("cur-2");
    expect((fetchMock.mock.calls[2][0] as URL).searchParams.get("cursor")).toBe("cur-3");
  });

  it("stops paginating when the next link advertises results=false", async () => {
    fetchMock.mockResolvedValue(okJson([{ id: 1 }], nextLink("cur", "false")));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "t" });

    expect(await client.getPaginated("/api/0/x/")).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops and truncates once maxItems is reached", async () => {
    fetchMock
      .mockResolvedValueOnce(okJson([{ id: 1 }, { id: 2 }], nextLink("cur-2")))
      .mockResolvedValueOnce(okJson([{ id: 3 }, { id: 4 }], nextLink("cur-3")));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "t" });

    const out = await client.getPaginated("/api/0/x/", undefined, { maxItems: 3 });

    expect(out).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("honours the maxPages backstop against an endless next link", async () => {
    fetchMock.mockResolvedValue(okJson([{ id: 1 }], nextLink("same-cursor")));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "t" });

    const out = await client.getPaginated("/api/0/x/", undefined, { maxPages: 3 });

    expect(out).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
