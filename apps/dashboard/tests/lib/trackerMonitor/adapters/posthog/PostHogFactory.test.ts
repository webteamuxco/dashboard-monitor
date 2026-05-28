import { describe, it, expect, beforeEach } from "vitest";
import { PostHogFactory } from "@/lib/trackerMonitor/adapters/posthog/PostHogFactory";
import { PostHogStrategy } from "@/lib/trackerMonitor/adapters/posthog/PostHogStrategy";

describe("PostHogFactory", () => {
  let factory: PostHogFactory;

  beforeEach(() => {
    factory = new PostHogFactory();
    delete process.env.POSTHOG_HOST;
    delete process.env.POSTHOG_PERSONAL_API_KEY;
    delete process.env.POSTHOG_PROJECT_ID;
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
    it("throws when POSTHOG_HOST is missing", () => {
      process.env.POSTHOG_PERSONAL_API_KEY = "tok";
      process.env.POSTHOG_PROJECT_ID = "1";

      expect(() => factory.create()).toThrow(/PostHog env vars missing/);
    });

    it("throws when POSTHOG_PERSONAL_API_KEY is missing", () => {
      process.env.POSTHOG_HOST = "https://x";
      process.env.POSTHOG_PROJECT_ID = "1";

      expect(() => factory.create()).toThrow(/PostHog env vars missing/);
    });

    it("throws when POSTHOG_PROJECT_ID is missing", () => {
      process.env.POSTHOG_HOST = "https://x";
      process.env.POSTHOG_PERSONAL_API_KEY = "tok";

      expect(() => factory.create()).toThrow(/PostHog env vars missing/);
    });

    it("returns a PostHogStrategy when all env vars are set", () => {
      process.env.POSTHOG_HOST = "https://x";
      process.env.POSTHOG_PERSONAL_API_KEY = "tok";
      process.env.POSTHOG_PROJECT_ID = "1";

      expect(factory.create()).toBeInstanceOf(PostHogStrategy);
    });
  });
});
