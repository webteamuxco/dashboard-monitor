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
import { glitchtipWiring } from "../../helpers/toolWiring";

describe("getLogMonitor", () => {
  beforeEach(() => {
    isConfigureMock.mockReset();
  });

  it("resolves the GlitchTip factory when the element wires glitchtip to the log monitor", () => {
    isConfigureMock.mockReturnValue(true);
    const wiring = glitchtipWiring();

    expect(getLogMonitor(wiring)).toBeInstanceOf(GlitchTipLogMonitorFactory);
    expect(isConfigureMock).toHaveBeenCalledWith(wiring, "log-monitor");
  });

  it("throws when the element has no log monitor wired in admin", () => {
    isConfigureMock.mockReturnValue(false);

    expect(() => getLogMonitor(glitchtipWiring())).toThrow(
      /No LogMonitorFactory supports type "log-monitor"/,
    );
  });
});
