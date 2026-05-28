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
