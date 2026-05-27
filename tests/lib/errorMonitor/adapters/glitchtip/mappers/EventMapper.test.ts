import { describe, it, expect } from "vitest";
import { mapGlitchTipEvent } from "@/lib/errorMonitor/adapters/glitchtip/mappers/EventMapper";
import type { GlitchTipEventDto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipEvent";

function baseDto(overrides: Partial<GlitchTipEventDto> = {}): GlitchTipEventDto {
  return {
    id: "evt1",
    eventID: "deadbeef",
    dateCreated: "2026-05-28T10:00:00Z",
    ...overrides,
  };
}

describe("mapGlitchTipEvent", () => {
  it("maps the flat fields and applies defaults to optional ones", () => {
    const out = mapGlitchTipEvent(baseDto());

    expect(out).toMatchObject({
      id: "evt1",
      eventID: "deadbeef",
      dateCreated: "2026-05-28T10:00:00Z",
      message: null,
      platform: null,
      tags: [],
      user: null,
      request: null,
      contexts: {},
      exceptions: [],
      breadcrumbs: [],
    });
  });

  it("maps an exception entry with stacktrace frames", () => {
    const out = mapGlitchTipEvent(
      baseDto({
        entries: [
          {
            type: "exception",
            data: {
              values: [
                {
                  type: "TypeError",
                  value: "x is undefined",
                  module: "app.module",
                  stacktrace: {
                    frames: [
                      {
                        filename: "/src/app.ts",
                        function: "doStuff",
                        lineNo: 42,
                        colNo: 7,
                        inApp: true,
                        contextLine: "throw new TypeError()",
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      }),
    );

    expect(out.exceptions).toEqual([
      {
        type: "TypeError",
        value: "x is undefined",
        module: "app.module",
        frames: [
          {
            filename: "/src/app.ts",
            function: "doStuff",
            lineNo: 42,
            colNo: 7,
            inApp: true,
            contextLine: "throw new TypeError()",
          },
        ],
      },
    ]);
  });

  it("defaults missing frame fields to null/false", () => {
    const out = mapGlitchTipEvent(
      baseDto({
        entries: [
          {
            type: "exception",
            data: {
              values: [
                { stacktrace: { frames: [{}] } },
              ],
            },
          },
        ],
      }),
    );

    expect(out.exceptions[0].frames[0]).toEqual({
      filename: null,
      function: null,
      lineNo: null,
      colNo: null,
      inApp: false,
      contextLine: null,
    });
  });

  it("returns an empty exceptions array when the entry has no values", () => {
    const out = mapGlitchTipEvent(
      baseDto({
        entries: [{ type: "exception", data: {} }],
      }),
    );

    expect(out.exceptions).toEqual([]);
  });

  it("maps breadcrumbs values", () => {
    const out = mapGlitchTipEvent(
      baseDto({
        entries: [
          {
            type: "breadcrumbs",
            data: {
              values: [
                {
                  timestamp: "2026-05-28T09:59:00Z",
                  type: "navigation",
                  category: "route",
                  level: "info",
                  message: "navigate to /home",
                  data: { from: "/" },
                },
              ],
            },
          },
        ],
      }),
    );

    expect(out.breadcrumbs).toEqual([
      {
        timestamp: "2026-05-28T09:59:00Z",
        type: "navigation",
        category: "route",
        level: "info",
        message: "navigate to /home",
        data: { from: "/" },
      },
    ]);
  });

  it("maps a request entry", () => {
    const out = mapGlitchTipEvent(
      baseDto({
        entries: [
          {
            type: "request",
            data: {
              url: "https://example.com/x",
              method: "POST",
              headers: [["X-A", "1"]],
              query: [["q", "v"]],
            },
          },
        ],
      }),
    );

    expect(out.request).toEqual({
      url: "https://example.com/x",
      method: "POST",
      headers: [["X-A", "1"]],
      query: [["q", "v"]],
    });
  });

  it("defaults missing request fields to null/empty arrays", () => {
    const out = mapGlitchTipEvent(
      baseDto({
        entries: [{ type: "request", data: {} }],
      }),
    );

    expect(out.request).toEqual({
      url: null,
      method: null,
      headers: [],
      query: [],
    });
  });

  it("maps a user, mapping snake_case ip_address to camelCase ipAddress", () => {
    const out = mapGlitchTipEvent(
      baseDto({
        user: {
          id: "u1",
          email: "a@b.c",
          username: "alice",
          ip_address: "1.2.3.4",
        },
      }),
    );

    expect(out.user).toEqual({
      id: "u1",
      email: "a@b.c",
      username: "alice",
      ipAddress: "1.2.3.4",
    });
  });

  it("returns null user when dto.user is null/undefined", () => {
    expect(mapGlitchTipEvent(baseDto({ user: null })).user).toBeNull();
    expect(mapGlitchTipEvent(baseDto()).user).toBeNull();
  });

  it("preserves tags and contexts when provided", () => {
    const out = mapGlitchTipEvent(
      baseDto({
        tags: [{ key: "env", value: "prod" }],
        contexts: { runtime: { name: "node" } },
      }),
    );

    expect(out.tags).toEqual([{ key: "env", value: "prod" }]);
    expect(out.contexts).toEqual({ runtime: { name: "node" } });
  });
});
