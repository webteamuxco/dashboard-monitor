import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";

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

  it("serializes an array param as a repeated param", async () => {
    fetchMock.mockResolvedValue(okJson([]));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "t" });

    await client.get("/api/0/x/", { groups: ["7", "29"], statsPeriod: "24h" });

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.searchParams.getAll("groups")).toEqual(["7", "29"]);
    expect(url.search).toBe("?groups=7&groups=29&statsPeriod=24h");
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

describe("GlitchTipClient.post", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function created(data: unknown): Response {
    return {
      ok: true,
      status: 201,
      json: async () => data,
    } as unknown as Response;
  }

  it("sends the JSON body with the auth and content-type headers", async () => {
    fetchMock.mockResolvedValue(created({ id: 1 }));
    const client = new GlitchTipClient({ baseUrl: "https://gt.example.com", token: "secret" });

    await client.post("/api/0/issues/7/comments/", { data: { text: "hi" } });

    const url = fetchMock.mock.calls[0][0] as URL;
    const init = fetchMock.mock.calls[0][1];
    expect(url.toString()).toBe("https://gt.example.com/api/0/issues/7/comments/");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"data":{"text":"hi"}}');
    expect(init.headers).toEqual({
      Authorization: "Bearer secret",
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(init.cache).toBe("no-store");
  });

  it("returns the parsed created entity", async () => {
    fetchMock.mockResolvedValue(created({ id: 12 }));
    const client = new GlitchTipClient({ baseUrl: "https://x", token: "t" });

    expect(await client.post<{ id: number }>("/p", {})).toEqual({ id: 12 });
  });

  it("throws on a non-2xx response like every other verb", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "invalid payload",
    } as unknown as Response);
    const client = new GlitchTipClient({ baseUrl: "https://x", token: "t" });

    await expect(client.post("/api/0/issues/7/comments/", {})).rejects.toThrow(
      /GlitchTip API error 422 on \/api\/0\/issues\/7\/comments\/: invalid payload/,
    );
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
