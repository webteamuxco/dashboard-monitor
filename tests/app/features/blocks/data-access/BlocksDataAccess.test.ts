import { describe, it, expect, vi, beforeEach } from "vitest";
import { glitchtipWiring, posthogWiring } from "../../../../helpers/toolWiring";

const {
  loadToolWiringMock,
  errorMeasuresMock,
  logMeasuresMock,
  trackerMeasuresMock,
} = vi.hoisted(() => ({
  loadToolWiringMock: vi.fn(),
  errorMeasuresMock: vi.fn(),
  logMeasuresMock: vi.fn(),
  trackerMeasuresMock: vi.fn(),
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

const createErrorConnectionMock = vi.fn(() => CONNECTION);

vi.mock("@/lib/errorMonitor/GetErrorMonitor", () => ({
  getErrorMonitorFactory: () => ({
    createConnection: createErrorConnectionMock,
    createStrategy: () => ({ getBlockMeasures: errorMeasuresMock }),
  }),
}));

vi.mock("@/lib/logMonitor/GetLogMonitor", () => ({
  getLogMonitor: () => ({
    createConnection: () => CONNECTION,
    createStrategy: () => ({ getBlockMeasures: logMeasuresMock }),
  }),
}));

vi.mock("@/lib/trackerMonitor/GetTrackerMonitor", () => ({
  getTrackerMonitor: () => ({
    createConnection: () => ({ baseUrl: "https://ph", projectId: "ph-project" }),
    createStrategy: () => ({ getBlockMeasures: trackerMeasuresMock }),
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
        color: null,
      },
    ],
  },
});

const EMPTY_SERIES = {
  type: "series" as const,
  windowMinutes: 30,
  interval: "1m" as const,
  series: [],
};

describe("BlocksDataAccess.getMeasure", () => {
  beforeEach(() => {
    loadToolWiringMock.mockReset();
    createErrorConnectionMock.mockClear();
    errorMeasuresMock.mockReset();
    logMeasuresMock.mockReset();
    trackerMeasuresMock.mockReset();
    errorMeasuresMock.mockResolvedValue(EMPTY_SERIES);
    logMeasuresMock.mockResolvedValue(EMPTY_SERIES);
    trackerMeasuresMock.mockResolvedValue(EMPTY_SERIES);
  });

  it("loads the wiring of the element it was given", async () => {
    loadToolWiringMock.mockResolvedValue(LOG_WIRING);

    await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-42", 30);

    expect(loadToolWiringMock).toHaveBeenCalledWith(
      DASHBOARD_BLOCK,
      "block-42",
    );
  });

  it("connects from the wiring the factory already holds", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());

    await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", 30);

    expect(createErrorConnectionMock).toHaveBeenCalledWith();
  });

  it("throws rather than measuring when the element declares no strategy", async () => {
    loadToolWiringMock.mockResolvedValue(
      glitchtipWiring({ strategy: undefined }),
    );

    await expect(
      new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", 30),
    ).rejects.toThrow(/declares no strategy/);
    expect(errorMeasuresMock).not.toHaveBeenCalled();
  });

  it("hands the window, the environment and the row cap to the strategy", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());

    await new BlocksDataAccess().getMeasure(
      DASHBOARD_BLOCK,
      "block-1",
      30,
      "production",
      5,
    );

    expect(errorMeasuresMock).toHaveBeenCalledWith(30, "production", 5, {
      tagId: null,
      showResolved: false,
    });
  });

  it("defaults the environment, the cap and the tag to null, and hides the resolved rows", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());

    await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", 30);

    expect(errorMeasuresMock).toHaveBeenCalledWith(30, null, null, {
      tagId: null,
      showResolved: false,
    });
  });

  it("returns the measure the strategy built, untouched", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());
    const measure = {
      type: "list" as const,
      entries: [],
      hasDetail: true,
      windowMinutes: null,
    };
    errorMeasuresMock.mockResolvedValue(measure);

    expect(
      await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", null),
    ).toEqual(measure);
  });

  // The per-family knobs travel in one bag the orchestrator fills the same way
  // for everyone: only the log monitor reads a tag id, only the error monitor a
  // resolution status, and each one ignores the other's.
  describe("the per-family options", () => {
    it("carries the selected log tag to the log monitor", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);

      await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        30,
        "production",
        null,
        "t2",
      );

      expect(logMeasuresMock).toHaveBeenCalledWith(30, "production", null, {
        tagId: "t2",
        showResolved: false,
      });
    });

    it("carries the resolved filter to the error monitor", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());

      await new BlocksDataAccess().getMeasure(
        DASHBOARD_BLOCK,
        "block-1",
        null,
        null,
        null,
        null,
        true,
      );

      expect(errorMeasuresMock).toHaveBeenCalledWith(null, null, null, {
        tagId: null,
        showResolved: true,
      });
    });
  });

  describe("picks the family the strategy names", () => {
    it("routes an error-monitor element to the error monitor", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());

      await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", 30);

      expect(errorMeasuresMock).toHaveBeenCalledTimes(1);
      expect(logMeasuresMock).not.toHaveBeenCalled();
      expect(trackerMeasuresMock).not.toHaveBeenCalled();
    });

    it("routes a log-monitor element to the log monitor", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);

      await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-2", 30);

      expect(logMeasuresMock).toHaveBeenCalledTimes(1);
      expect(errorMeasuresMock).not.toHaveBeenCalled();
    });

    it("routes a tracker-monitor element to the tracker monitor", async () => {
      loadToolWiringMock.mockResolvedValue(posthogWiring());

      await new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-3", 60);

      expect(trackerMeasuresMock).toHaveBeenCalledWith(60, null, null, {
        tagId: null,
        showResolved: false,
      });
      expect(errorMeasuresMock).not.toHaveBeenCalled();
    });
  });

  it("lets a provider failure bubble up — the route turns it into a 502", async () => {
    loadToolWiringMock.mockResolvedValue(posthogWiring());
    trackerMeasuresMock.mockRejectedValue(
      new Error("asks a list from a tracker monitor, which exposes no rows"),
    );

    await expect(
      new BlocksDataAccess().getMeasure(DASHBOARD_BLOCK, "block-1", null),
    ).rejects.toThrow(/exposes no rows/);
  });
});
