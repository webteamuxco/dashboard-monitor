import { describe, it, expect, vi, beforeEach } from "vitest";

const isConfigureMock = vi.fn();
const resolveConnectionMock = vi.fn();

vi.mock("@/lib/config/domain/tool/GlitchtipConfigurationStrategy", () => ({
  GlitchtipConfigurationStrategy: class {
    isConfigure = isConfigureMock;
    resolveConnection = resolveConnectionMock;
  },
}));

import { getErrorMonitorFactory } from "@/lib/errorMonitor/GetErrorMonitor";
import { GlitchTipFactory } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorFactory";

describe("getErrorMonitorFactory", () => {
  beforeEach(() => {
    isConfigureMock.mockReset();
  });

  it("resolves the GlitchTip factory when the project maps glitchtip to the error monitor", async () => {
    isConfigureMock.mockResolvedValue(true);

    await expect(getErrorMonitorFactory("doc1")).resolves.toBeInstanceOf(GlitchTipFactory);
    expect(isConfigureMock).toHaveBeenCalledWith("doc1", "error-monitor", "glitchtip");
  });

  it("rejects when the project has no error monitor mapped in admin", async () => {
    isConfigureMock.mockResolvedValue(false);

    await expect(getErrorMonitorFactory("doc1")).rejects.toThrow(
      /No ErrorMonitorFactory supports type "error-monitor"/,
    );
  });
});
