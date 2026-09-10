import { describe, it, expect, vi, beforeEach } from "vitest";
import { glitchtipWiring, posthogWiring } from "../../../../helpers/toolWiring";

const {
  loadToolWiringMock,
  getErrorStatsMock,
  getIssuesMock,
  getLogsMock,
  getActiveUsersTimelineMock,
} = vi.hoisted(() => ({
  loadToolWiringMock: vi.fn(),
  getErrorStatsMock: vi.fn(),
  getIssuesMock: vi.fn(),
  getLogsMock: vi.fn(),
  getActiveUsersTimelineMock: vi.fn(),
}));

vi.mock("@/lib/config/domain/loadToolWiring", () => ({
  DASHBOARD_KPI: "dashboard-kpi",
  DASHBOARD_BLOCK: "dashboard-block",
  loadToolWiring: loadToolWiringMock,
}));

const CONNECTION = {
  baseUrl: "https://gt",
  organizationSlug: "org",
  projectId: "provider-project",
};

vi.mock("@/lib/errorMonitor/GetErrorMonitor", () => ({
  getErrorMonitorFactory: () => ({
    createConnection: () => CONNECTION,
    createStrategy: () => ({
      getErrorStats: getErrorStatsMock,
      getIssues: getIssuesMock,
    }),
  }),
}));

vi.mock("@/lib/logMonitor/GetLogMonitor", () => ({
  getLogMonitor: () => ({
    createConnection: () => CONNECTION,
    createStrategy: () => ({ getLogs: getLogsMock }),
  }),
}));

vi.mock("@/lib/trackerMonitor/GetTrackerMonitor", () => ({
  getTrackerMonitor: () => ({
    createConnection: () => ({ baseUrl: "https://ph", projectId: "ph-project" }),
    createStrategy: () => ({
      getActiveUsersTimeline: getActiveUsersTimelineMock,
    }),
  }),
}));

import { BlocksDataAccess } from "@/app/features/blocks/data-access/BlocksDataAccess";
import { DASHBOARD_BLOCK } from "@/lib/config/domain/loadToolWiring";

const LOG_WIRING = glitchtipWiring({
  strategy: {
    kind: "log-monitor",
    id: "s2",
    tags: [
      {
        id: "t1",
        name: "reservation",
        value: "reservation.sent",
        description: null,
      },
    ],
  },
});

const MULTI_TAG_WIRING = glitchtipWiring({
  strategy: {
    kind: "log-monitor",
    id: "s3",
    tags: [
      {
        id: "t1",
        name: "Envoyées",
        value: "reservation.sent",
        description: null,
      },
      {
        id: "t2",
        name: "Annulées",
        value: "reservation.cancelled",
        description: null,
      },
    ],
  },
});

describe("BlocksDataAccess.getMeasure", () => {
  beforeEach(() => {
    loadToolWiringMock.mockReset();
    getErrorStatsMock.mockReset();
    getIssuesMock.mockReset();
    getLogsMock.mockReset();
    getActiveUsersTimelineMock.mockReset();
  });

  it("loads the wiring of the element it was given", async () => {
    loadToolWiringMock.mockResolvedValue(LOG_WIRING);
    getLogsMock.mockResolvedValue([]);

    await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-42", 30);

    expect(loadToolWiringMock).toHaveBeenCalledWith(
      DASHBOARD_BLOCK,
      "block-42",
    );
  });

  it("throws when the element declares no strategy", async () => {
    loadToolWiringMock.mockResolvedValue(
      glitchtipWiring({ strategy: undefined }),
    );

    await expect(
      new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", 30),
    ).rejects.toThrow(/declares no strategy/);
  });

  describe("a windowed block", () => {
    it("returns one series shape whichever chart will draw it", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);
      getLogsMock.mockResolvedValue([]);

      const measure = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        30,
      );

      expect(measure.type).toBe("series");
      expect(measure.windowMinutes).toBe(30);
    });

    it("buckets the log timestamps the log monitor returns", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);
      const now = Date.now();
      getLogsMock.mockResolvedValue([
        { id: "l1", message: "m", level: "info", timestamp: new Date(now).toISOString() },
        { id: "l2", message: "m", level: "info", timestamp: new Date(now).toISOString() },
      ]);

      const measure = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        30,
      );

      if (measure.type !== "series") throw new Error("expected a series");
      expect(measure.series).toHaveLength(1);
      expect(measure.series[0].key).toBe("count");
      const total = measure.series[0].points.reduce(
        (sum, point) => sum + (point.count ?? 0),
        0,
      );
      expect(total).toBe(2);
    });

    it("fills the quiet buckets so a bar is a real zero, not a gap", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);
      getLogsMock.mockResolvedValue([]);

      const measure = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        30,
      );

      if (measure.type !== "series") throw new Error("expected a series");
      expect(measure.series[0].points).toHaveLength(30);
      expect(
        measure.series[0].points.every((point) => point.count === 0),
      ).toBe(true);
    });

    it("gives the tracker timeline one series per visitor kind — what a stack needs", async () => {
      loadToolWiringMock.mockResolvedValue(posthogWiring());
      getActiveUsersTimelineMock.mockResolvedValue([
        {
          minuteIso: "2026-09-09T08:00:00.000Z",
          label: "08:00",
          newCount: 4,
          returningCount: 7,
        },
      ]);

      const measure = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        60,
      );

      if (measure.type !== "series") throw new Error("expected a series");
      expect(measure.series.map((series) => series.key)).toEqual([
        "newCount",
        "returningCount",
      ]);
      expect(measure.series[0].points[0].count).toBe(4);
      expect(measure.series[1].points[0].count).toBe(7);
    });

    it("keeps the buckets coarse on a wide window", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getErrorStatsMock.mockResolvedValue({ interval: "1h", points: [] });

      await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        24 * 60,
      );

      expect(getErrorStatsMock.mock.calls[0][1].interval).toBe("1h");
    });

    it("reports the granularity the provider served, not the one asked for", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      // 30 minutes asks for minutes; the environment-scoped GlitchTip path can
      // only answer hourly, and the measure has to carry that back to the card.
      getErrorStatsMock.mockResolvedValue({
        interval: "1h",
        points: [{ timestamp: "2026-09-09T09:00:00.000Z", count: 3 }],
      });

      const measure = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        30,
        "production",
      );

      if (measure.type !== "series") throw new Error("expected a series");
      expect(measure.interval).toBe("1h");
      expect(measure.windowMinutes).toBe(30);
      expect(measure.series[0].points[0].label).toBe("11h");
    });
  });

  describe("a block declaring several log tags", () => {
    it("queries only the selected tag, since the provider ANDs the terms of one query", async () => {
      loadToolWiringMock.mockResolvedValue(MULTI_TAG_WIRING);
      getLogsMock.mockResolvedValue([]);

      await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        30,
        "production",
        null,
        "t2",
      );

      expect(getLogsMock.mock.calls[0][1].query).toBe(
        "reservation.cancelled.production",
      );
    });

    it("names the series after the selected tag", async () => {
      loadToolWiringMock.mockResolvedValue(MULTI_TAG_WIRING);
      getLogsMock.mockResolvedValue([]);

      const measure = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        30,
        null,
        null,
        "t2",
      );

      if (measure.type !== "series") throw new Error("expected a series");
      expect(measure.series[0].label).toBe("Annulées");
    });

    it("refuses a tag the element does not declare rather than passing it to the provider", async () => {
      loadToolWiringMock.mockResolvedValue(MULTI_TAG_WIRING);

      await expect(
        new BlocksDataAccess().getMeasure(
          DASHBOARD_BLOCK,
          "block-1",
          30,
          null,
          null,
          "reservation.sent OR anything",
        ),
      ).rejects.toThrow(/declares no tag/);
      expect(getLogsMock).not.toHaveBeenCalled();
    });

    it("keeps the legacy behaviour when no tag is selected", async () => {
      loadToolWiringMock.mockResolvedValue(MULTI_TAG_WIRING);
      getLogsMock.mockResolvedValue([]);

      await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", 30);

      expect(getLogsMock.mock.calls[0][1].query).toBe(
        "reservation.sent reservation.cancelled",
      );
    });
  });

  describe("an unwindowed block", () => {
    it("returns the list shape", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getIssuesMock.mockResolvedValue([]);

      const measure = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        null,
        null,
        5,
      );

      expect(measure.type).toBe("list");
      expect(getIssuesMock.mock.calls[0][1].limit).toBe(5);
    });

    it("opens a detail sheet for issues, never for logs", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getIssuesMock.mockResolvedValue([]);
      const issues = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        null,
      );

      loadToolWiringMock.mockResolvedValue(LOG_WIRING);
      getLogsMock.mockResolvedValue([]);
      const logs = await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-2",
        null,
      );

      if (issues.type !== "list" || logs.type !== "list") {
        throw new Error("expected two lists");
      }
      expect(issues.hasDetail).toBe(true);
      expect(logs.hasDetail).toBe(false);
    });

    it("refuses a list from a tracker monitor, which exposes no rows", async () => {
      loadToolWiringMock.mockResolvedValue(posthogWiring());

      await expect(
        new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", null),
      ).rejects.toThrow(/exposes no rows/);
    });
  });
});
