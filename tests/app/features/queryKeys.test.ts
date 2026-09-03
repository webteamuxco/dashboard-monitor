import { describe, it, expect } from "vitest";
import { configKeys } from "@/app/features/config/queryKeys";
import { issuesKeys } from "@/app/features/issues/queryKeys";
import { errorRateKeys } from "@/app/features/errorRate/queryKeys";
import { reservationsKeys } from "@/app/features/reservations/queryKeys";
import { visitorsKeys } from "@/app/features/visitors/queryKeys";

/**
 * Query keys are the contract between the server prefetch and the client
 * hooks. A changed segment is silent: nothing fails, the hydrated cache is
 * just never read. These tests pin the shapes.
 */
describe("configKeys", () => {
  it("keys the catalog with no variable", () => {
    expect(configKeys.projects()).toEqual(["config", "projects"]);
  });

  it("keys one project by its documentId", () => {
    expect(configKeys.project("project-1")).toEqual([
      "config",
      "project",
      "project-1",
    ]);
  });

  it("keys the panel list by the project documentId", () => {
    // Without the id, switching project served the previous project's panels
    // until the 5-minute staleTime expired.
    expect(configKeys.pannels("project-1")).toEqual([
      "config",
      "pannels",
      "project-1",
    ]);
  });

  it("gives every config key the same prefix, so one invalidation covers all", () => {
    expect(configKeys.projects()[0]).toBe("config");
    expect(configKeys.project("p")[0]).toBe("config");
    expect(configKeys.pannels("p")[0]).toBe("config");
  });

  it("changes the panel-list key when the project changes", () => {
    expect(configKeys.pannels("project-1")).not.toEqual(
      configKeys.pannels("project-2"),
    );
  });
});

describe("issuesKeys", () => {
  it("keys the recent list broad to narrow", () => {
    expect(issuesKeys.recent("panel-1", 20, "production")).toEqual([
      "issues",
      "recent",
      "panel-1",
      20,
      "production",
    ]);
  });

  it("defaults the environment to null so the key stays stable", () => {
    expect(issuesKeys.recent("panel-1", 20)).toEqual([
      "issues",
      "recent",
      "panel-1",
      20,
      null,
    ]);
  });

  it("keys a detail by the provider issue id, then the environment", () => {
    // The detail's events feed is environment-scoped, so switching the
    // selector must be a cache miss rather than a stale re-read.
    expect(issuesKeys.detail("i1", "production")).toEqual([
      "issues",
      "detail",
      "i1",
      "production",
    ]);
  });

  it("defaults the detail's environment to null so the key stays stable", () => {
    expect(issuesKeys.detail("i1")).toEqual(["issues", "detail", "i1", null]);
  });

  it("keys the strategy list by project, environment and panel slug", () => {
    // The panel slug is a factory argument, not something the hook appends —
    // that is what lets page.tsx seed the very same key.
    expect(issuesKeys.isConfig("project-1", "production", "prod-panel")).toEqual(
      ["issues", "isConfig", "project-1", "production", "prod-panel"],
    );
  });

  it("defaults the strategy key's environment and panel slug to null", () => {
    expect(issuesKeys.isConfig("project-1")).toEqual([
      "issues",
      "isConfig",
      "project-1",
      null,
      null,
    ]);
  });

  it("distinguishes two panels of the same project", () => {
    expect(issuesKeys.isConfig("project-1", null, "prod")).not.toEqual(
      issuesKeys.isConfig("project-1", null, "staging"),
    );
  });
});

describe("errorRateKeys", () => {
  it("keys the series by panel id and environment", () => {
    expect(errorRateKeys.series("panel-1", "staging")).toEqual([
      "errorRate",
      "series",
      "panel-1",
      "staging",
    ]);
  });

  it("defaults the environment to null", () => {
    expect(errorRateKeys.series("panel-1")).toEqual([
      "errorRate",
      "series",
      "panel-1",
      null,
    ]);
  });
});

describe("reservationsKeys", () => {
  it("keys the series by panel id, window and environment", () => {
    expect(reservationsKeys.series("panel-1", 30, "production")).toEqual([
      "reservations",
      "series",
      "panel-1",
      30,
      "production",
    ]);
  });

  it("defaults the environment to null", () => {
    expect(reservationsKeys.series("panel-1", 30)).toEqual([
      "reservations",
      "series",
      "panel-1",
      30,
      null,
    ]);
  });
});

describe("visitorsKeys", () => {
  it("keys the timeline by panel id and window", () => {
    expect(visitorsKeys.timeline("panel-1", 60)).toEqual([
      "visitors",
      "timeline",
      "panel-1",
      60,
    ]);
  });
});

describe("key layout invariants", () => {
  it("puts the id first among the variable segments of every data key", () => {
    expect(issuesKeys.recent("panel-1", 20)[2]).toBe("panel-1");
    expect(errorRateKeys.series("panel-1")[2]).toBe("panel-1");
    expect(reservationsKeys.series("panel-1", 30)[2]).toBe("panel-1");
    expect(visitorsKeys.timeline("panel-1", 60)[2]).toBe("panel-1");
    expect(configKeys.project("project-1")[2]).toBe("project-1");
    expect(configKeys.pannels("project-1")[2]).toBe("project-1");
  });

  it("starts every key with two constant segments", () => {
    const keys = [
      configKeys.projects(),
      configKeys.project("p"),
      configKeys.pannels("p"),
      issuesKeys.recent("p", 1),
      issuesKeys.detail("i"),
      issuesKeys.isConfig("p"),
      errorRateKeys.series("p"),
      reservationsKeys.series("p", 1),
      visitorsKeys.timeline("p", 1),
    ];

    for (const key of keys) {
      expect(typeof key[0]).toBe("string");
      expect(typeof key[1]).toBe("string");
    }
  });
});
