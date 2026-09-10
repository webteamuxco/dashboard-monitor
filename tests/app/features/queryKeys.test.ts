import { describe, it, expect } from "vitest";
import { configKeys } from "@/app/features/config/queryKeys";
import { issuesKeys } from "@/app/features/issues/queryKeys";
import { errorRateKeys } from "@/app/features/errorRate/queryKeys";
import { dashboardBlockKeys } from "@/app/features/blocks/queryKeys";
import { dashboardKpiKeys } from "@/app/features/kpis/queryKeys";
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

  it("keys the panel list by the project documentId and the dev-panel flag", () => {
    // Without the id, switching project served the previous project's panels
    // until the 5-minute staleTime expired.
    expect(configKeys.pannels("project-1", false)).toEqual([
      "config",
      "pannels",
      "project-1",
      false,
    ]);
  });

  it("gives every config key the same prefix, so one invalidation covers all", () => {
    expect(configKeys.projects()[0]).toBe("config");
    expect(configKeys.project("p")[0]).toBe("config");
    expect(configKeys.pannels("p", false)[0]).toBe("config");
  });

  it("changes the panel-list key when the project changes", () => {
    expect(configKeys.pannels("project-1", false)).not.toEqual(
      configKeys.pannels("project-2", false),
    );
  });

  it("changes the panel-list key when ?showDevelopmentPanel flips", () => {
    // The flag narrows the Strapi query, so the two lists are different
    // resources. Sharing one key served the filtered list to the dev view
    // for the whole 5-minute staleTime.
    expect(configKeys.pannels("project-1", true)).not.toEqual(
      configKeys.pannels("project-1", false),
    );
  });
});

describe("issuesKeys", () => {
  it("keys the recent list broad to narrow", () => {
    expect(issuesKeys.recentKpi("open-issues", 20)).toEqual([
      "issues",
      "recent",
      "open-issues",
      20,
    ]);
  });

  it("keys a detail by the provider issue id alone", () => {
    expect(issuesKeys.detail("i1")).toEqual(["issues", "detail", "i1"]);
  });

  it("keys the strategy list by panel slug", () => {
    expect(issuesKeys.isConfig("prod-panel")).toEqual([
      "issues",
      "isConfig",
      "prod-panel",
    ]);
  });

  it("defaults the strategy key's panel slug to null", () => {
    expect(issuesKeys.isConfig()).toEqual(["issues", "isConfig", null]);
  });

  it("distinguishes two panels", () => {
    expect(issuesKeys.isConfig("prod")).not.toEqual(
      issuesKeys.isConfig("staging"),
    );
  });
});

describe("dashboardBlockKeys", () => {
  it("keys a block measure by the element id, then the variables", () => {
    expect(
      dashboardBlockKeys.measure("block-1", 30, "production", 20, "tag-1"),
    ).toEqual([
      "dashboardBlocks",
      "measure",
      "block-1",
      30,
      "production",
      20,
      "tag-1",
    ]);
  });

  it("defaults the environment, the row limit and the tag to null", () => {
    expect(dashboardBlockKeys.measure("block-1", 30)).toEqual([
      "dashboardBlocks",
      "measure",
      "block-1",
      30,
      null,
      null,
      null,
    ]);
  });

  it("gives each tag of a multi-tag block its own cache entry", () => {
    expect(
      dashboardBlockKeys.measure("block-1", 30, null, null, "tag-1"),
    ).not.toEqual(
      dashboardBlockKeys.measure("block-1", 30, null, null, "tag-2"),
    );
  });

  it("separates a windowed block from an unwindowed one", () => {
    expect(dashboardBlockKeys.measure("block-1", 30)).not.toEqual(
      dashboardBlockKeys.measure("block-1", null),
    );
  });

  it("keys the block list by panel slug", () => {
    expect(dashboardBlockKeys.config("prod-panel")).toEqual([
      "dashboardBlocks",
      "config",
      "prod-panel",
    ]);
  });
});

describe("dashboardKpiKeys", () => {
  it("keys a KPI measure by the element id, then the variables", () => {
    expect(dashboardKpiKeys.measure("kpi-1", 30, "production")).toEqual([
      "dashboardKpis",
      "measure",
      "kpi-1",
      30,
      "production",
    ]);
  });

  it("keys the KPI list by panel slug", () => {
    expect(dashboardKpiKeys.config("prod-panel")).toEqual([
      "dashboardKpis",
      "config",
      "prod-panel",
    ]);
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
    expect(issuesKeys.recentKpi("open-issues", 20)[2]).toBe("open-issues");
    expect(errorRateKeys.series("panel-1")[2]).toBe("panel-1");
    expect(dashboardBlockKeys.measure("block-1", 30)[2]).toBe("block-1");
    expect(dashboardKpiKeys.measure("kpi-1", 30)[2]).toBe("kpi-1");
    expect(visitorsKeys.timeline("panel-1", 60)[2]).toBe("panel-1");
    expect(configKeys.project("project-1")[2]).toBe("project-1");
    expect(configKeys.pannels("project-1", false)[2]).toBe("project-1");
  });

  it("starts every key with two constant segments", () => {
    const keys = [
      configKeys.projects(),
      configKeys.project("p"),
      configKeys.pannels("p", false),
      issuesKeys.recentKpi("k", 1),
      issuesKeys.detail("i"),
      issuesKeys.isConfig("p"),
      errorRateKeys.series("p"),
      dashboardBlockKeys.measure("b", 1),
      dashboardBlockKeys.config("p"),
      dashboardKpiKeys.measure("k", 1),
      dashboardKpiKeys.config("p"),
      visitorsKeys.timeline("p", 1),
    ];

    for (const key of keys) {
      expect(typeof key[0]).toBe("string");
      expect(typeof key[1]).toBe("string");
    }
  });
});
