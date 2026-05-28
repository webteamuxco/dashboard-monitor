import { describe, it, expect } from "vitest";
import { mapGlitchTipLog } from "@/lib/logMonitor/adapters/glitchtip/mappers/logsMapper";
import type { GlitchTipLogDto } from "@/lib/logMonitor/adapters/glitchtip/dto/GlitchTipLogs";

describe("mapGlitchTipLog", () => {
  it("maps body → message and timestamp/id straight through", () => {
    const dto: GlitchTipLogDto = {
      id: "l1",
      body: "boot completed",
      level: "info",
      timestamp: "2026-05-28T08:00:00Z",
    };

    expect(mapGlitchTipLog(dto)).toEqual({
      id: "l1",
      message: "boot completed",
      level: "info",
      timestamp: "2026-05-28T08:00:00Z",
    });
  });

  it("collapses 'fatal' GlitchTip level into 'error' LogLevel", () => {
    const out = mapGlitchTipLog({
      id: "l2",
      body: "crash",
      level: "fatal",
      timestamp: "2026-05-28T08:00:00Z",
    });

    expect(out.level).toBe("error");
  });

  it.each(["error", "warning", "info", "debug"] as const)(
    "passes through level '%s' unchanged",
    (level) => {
      const out = mapGlitchTipLog({
        id: "x",
        body: "",
        level,
        timestamp: "",
      });
      expect(out.level).toBe(level);
    },
  );
});
