import { describe, it, expect, beforeEach } from "vitest";
import { PostHogFactory } from "@/lib/trackerMonitor/adapters/posthog/PostHogFactory";
import { PostHogStrategy } from "@/lib/trackerMonitor/adapters/posthog/PostHogStrategy";

const CONNECTION = { baseUrl: "https://x", projectId: "1" };

describe("PostHogFactory", () => {
  let factory: PostHogFactory;

  beforeEach(() => {
    factory = new PostHogFactory();
    delete process.env.POSTHOG_PERSONAL_API_KEY;
  });

  describe("support", () => {
    it("matches 'posthog'", () => {
      expect(factory.support("posthog")).toBe(true);
    });

    it("rejects other types", () => {
      expect(factory.support("glitchtip")).toBe(false);
      expect(factory.support("")).toBe(false);
    });
  });

  describe("create", () => {
    it("throws when POSTHOG_PERSONAL_API_KEY is missing", () => {
      expect(() => factory.create(CONNECTION)).toThrow(/POSTHOG_PERSONAL_API_KEY is required/);
    });

    it("returns a PostHogStrategy when the api key is set", () => {
      process.env.POSTHOG_PERSONAL_API_KEY = "tok";

      expect(factory.create(CONNECTION)).toBeInstanceOf(PostHogStrategy);
    });
  });
});
