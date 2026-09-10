import { describe, it, expect, vi, beforeEach } from "vitest";

const isConfigureMock = vi.fn();
const resolveConnectionMock = vi.fn();

vi.mock("@/lib/config/domain/tool/PosthogConfigurationStrategy", () => ({
  PosthogConfigurationStrategy: class {
    isConfigure = isConfigureMock;
    resolveConnection = resolveConnectionMock;
  },
}));

import { PostHogFactory } from "@/lib/trackerMonitor/adapters/posthog/PostHogFactory";
import { PostHogStrategy } from "@/lib/trackerMonitor/adapters/posthog/PostHogStrategy";
import { posthogWiring } from "../../../../helpers/toolWiring";

const CONNECTION = { baseUrl: "https://ph", projectId: "1" };

describe("PostHogFactory", () => {
  let factory: PostHogFactory;

  beforeEach(() => {
    factory = new PostHogFactory();
    isConfigureMock.mockReset();
    resolveConnectionMock.mockReset();
    delete process.env.POSTHOG_PERSONAL_API_KEY;
  });

  describe("support", () => {
    it("asks the configuration strategy whether the wiring names posthog", () => {
      isConfigureMock.mockReturnValue(true);
      const wiring = posthogWiring();

      expect(factory.support(wiring, "tracker-monitor")).toBe(true);
      expect(isConfigureMock).toHaveBeenCalledWith(wiring, "tracker-monitor");
    });

    it("returns false when the element does not wire posthog", () => {
      isConfigureMock.mockReturnValue(false);

      expect(factory.support(posthogWiring(), "tracker-monitor")).toBe(false);
    });
  });

  describe("createConnection", () => {
    it("delegates to the PostHog configuration strategy", () => {
      resolveConnectionMock.mockReturnValue(CONNECTION);
      const wiring = posthogWiring();

      expect(factory.createConnection(wiring)).toEqual(CONNECTION);
      expect(resolveConnectionMock).toHaveBeenCalledWith(wiring);
    });
  });

  describe("createStrategy", () => {
    it("throws when POSTHOG_PERSONAL_API_KEY is missing", () => {
      expect(() => factory.createStrategy(CONNECTION)).toThrow(
        /POSTHOG_PERSONAL_API_KEY is required/,
      );
    });

    it("returns a PostHogStrategy when the api key is set", () => {
      process.env.POSTHOG_PERSONAL_API_KEY = "tok";

      expect(factory.createStrategy(CONNECTION)).toBeInstanceOf(PostHogStrategy);
    });
  });
});
