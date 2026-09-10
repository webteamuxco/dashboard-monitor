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
import { glitchtipWiring } from "../../helpers/toolWiring";

describe("getErrorMonitorFactory", () => {
  beforeEach(() => {
    isConfigureMock.mockReset();
  });

  it("resolves the GlitchTip factory when the element wires glitchtip to the error monitor", () => {
    isConfigureMock.mockReturnValue(true);
    const wiring = glitchtipWiring();

    expect(getErrorMonitorFactory(wiring)).toBeInstanceOf(GlitchTipFactory);
    expect(isConfigureMock).toHaveBeenCalledWith(wiring, "error-monitor");
  });

  it("throws when the element has no error monitor wired in admin", () => {
    isConfigureMock.mockReturnValue(false);

    expect(() => getErrorMonitorFactory(glitchtipWiring())).toThrow(
      /No ErrorMonitorFactory supports type "error-monitor"/,
    );
  });

  it("names the element in the failure, so admin knows what to fix", () => {
    isConfigureMock.mockReturnValue(false);

    expect(() => getErrorMonitorFactory(glitchtipWiring({ id: "kpi-42" }))).toThrow(
      /Strapi element "kpi-42"/,
    );
  });
});
