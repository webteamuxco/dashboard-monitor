import { describe, it, expect, vi, beforeEach } from "vitest";

const isConfigureMock = vi.fn();
const resolveConnectionMock = vi.fn();

vi.mock("@/lib/config/domain/tool/GlitchtipConfigurationStrategy", () => ({
  GlitchtipConfigurationStrategy: class {
    isConfigure = isConfigureMock;
    resolveConnection = resolveConnectionMock;
  },
}));

import { getLogMonitor } from "@/lib/logMonitor/GetLogMonitor";
import { GlitchTipLogMonitorFactory } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorFactory";

describe("getLogMonitor", () => {
  beforeEach(() => {
    isConfigureMock.mockReset();
  });

  it("resolves the GlitchTip factory when the project maps glitchtip to the log monitor", async () => {
    isConfigureMock.mockResolvedValue(true);

    await expect(getLogMonitor("doc1")).resolves.toBeInstanceOf(GlitchTipLogMonitorFactory);
    expect(isConfigureMock).toHaveBeenCalledWith("doc1", "log-monitor", "glitchtip");
  });

  it("rejects when the project has no log monitor mapped in admin", async () => {
    isConfigureMock.mockResolvedValue(false);

    await expect(getLogMonitor("doc1")).rejects.toThrow(
      /No LogMonitorFactory supports type "log-monitor"/,
    );
  });
});
