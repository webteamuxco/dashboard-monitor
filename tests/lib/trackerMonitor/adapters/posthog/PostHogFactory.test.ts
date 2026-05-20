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
    it("asks Strapi whether the project maps posthog to the given strategy", async () => {
      isConfigureMock.mockResolvedValue(true);

      await expect(factory.support("doc1", "tracker-monitor")).resolves.toBe(true);
      expect(isConfigureMock).toHaveBeenCalledWith("doc1", "tracker-monitor", "posthog");
    });

    it("returns false when the project does not map posthog", async () => {
      isConfigureMock.mockResolvedValue(false);

      await expect(factory.support("doc1", "tracker-monitor")).resolves.toBe(false);
    });
  });

  describe("createConnection", () => {
    it("delegates to the PostHog configuration strategy", async () => {
      resolveConnectionMock.mockResolvedValue(CONNECTION);

      await expect(factory.createConnection("doc1")).resolves.toEqual(CONNECTION);
      expect(resolveConnectionMock).toHaveBeenCalledWith("doc1");
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
