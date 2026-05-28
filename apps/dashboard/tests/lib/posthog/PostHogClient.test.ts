import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PostHogClient } from "@/lib/posthog/PostHogClient";

describe("PostHogClient.query", () => {
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

  it("posts to /api/projects/<id>/query/ with Bearer auth, HogQL body and refresh=force_blocking", async () => {
    fetchMock.mockResolvedValue(okJson({ results: [] }));
    const client = new PostHogClient({
      baseUrl: "https://eu.posthog.com",
      token: "tok",
      projectId: "1234",
    });

    await client.query("SELECT 1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://eu.posthog.com/api/projects/1234/query/");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer tok",
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(init.cache).toBe("no-store");
    expect(JSON.parse(init.body)).toEqual({
      query: { kind: "HogQLQuery", query: "SELECT 1" },
      refresh: "force_blocking",
    });
  });

  it("strips trailing slash from baseUrl", async () => {
    fetchMock.mockResolvedValue(okJson({ results: [] }));
    const client = new PostHogClient({
      baseUrl: "https://eu.posthog.com/",
      token: "tok",
      projectId: "9",
    });

    await client.query("SELECT 1");

    expect(fetchMock.mock.calls[0][0]).toBe("https://eu.posthog.com/api/projects/9/query/");
  });

  it("returns the parsed JSON body on success", async () => {
    fetchMock.mockResolvedValue(okJson({ results: [[1, 2, 3]] }));
    const client = new PostHogClient({ baseUrl: "https://x", token: "t", projectId: "p" });

    const out = await client.query<{ results: number[][] }>("SELECT 1");

    expect(out).toEqual({ results: [[1, 2, 3]] });
  });

  it("throws on non-2xx with status and truncated body", async () => {
    fetchMock.mockResolvedValue(notOk(500, "internal error body".repeat(50)));
    const client = new PostHogClient({ baseUrl: "https://x", token: "t", projectId: "p" });

    await expect(client.query("Q")).rejects.toThrow(/PostHog API error 500 on \/query\/:/);
  });

  it("still throws cleanly when the error body can't be read", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => { throw new Error("stream"); },
    } as unknown as Response);
    const client = new PostHogClient({ baseUrl: "https://x", token: "t", projectId: "p" });

    await expect(client.query("Q")).rejects.toThrow(/PostHog API error 502/);
  });
});
