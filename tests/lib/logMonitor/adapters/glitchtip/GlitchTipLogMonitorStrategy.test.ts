import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlitchTipLogMonitorStrategy } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorStrategy";
import type { GlitchTipClient } from "@/lib/glitchtip/GlitchTipClient";

describe("GlitchTipLogMonitorStrategy.getLogs", () => {
  let getPaginated: ReturnType<typeof vi.fn>;
  let strategy: GlitchTipLogMonitorStrategy;

  beforeEach(() => {
    getPaginated = vi.fn().mockResolvedValue([]);
    strategy = new GlitchTipLogMonitorStrategy(
      { getPaginated } as unknown as GlitchTipClient,
      "my-org",
    );
  });

  it("fetches all pages from the org logs endpoint with project + filters + period", async () => {
    await strategy.getLogs(
      "p1",
      { query: "reservation.sent" },
      { from: "2026-05-28T00:00:00Z", to: "2026-05-28T01:00:00Z", interval: "1m" },
    );

    expect(getPaginated).toHaveBeenCalledWith(
      "/api/0/organizations/my-org/logs/",
      {
        project: "p1",
        start: "2026-05-28T00:00:00Z",
        end: "2026-05-28T01:00:00Z",
        query: "reservation.sent",
      },
    );
  });

  it("leaves period fields undefined when no period is passed", async () => {
    await strategy.getLogs("p1");

    expect(getPaginated.mock.calls[0][1]).toMatchObject({
      project: "p1",
      start: undefined,
      end: undefined,
      query: undefined,
    });
  });

  it("maps the response through mapGlitchTipLog (fatal collapses to error)", async () => {
    getPaginated.mockResolvedValue([
      { id: "l1", body: "boom", level: "fatal", timestamp: "2026-05-28T00:00:00Z" },
    ]);

    const out = await strategy.getLogs("p1");

    expect(out).toEqual([
      { id: "l1", message: "boom", level: "error", timestamp: "2026-05-28T00:00:00Z" },
    ]);
  });

  it("returns an empty array when the client returns []", async () => {
    expect(await strategy.getLogs("p1")).toEqual([]);
  });
});
