import type { ToolWiring } from "@/lib/config/domain/ToolWiring";
import {
  ERROR_MONITOR_STRATEGY_ENUM,
  TRACKER_MONITOR_STRATEGY_ENUM,
} from "@/lib/shared/strategiesEnum";

export function glitchtipWiring(overrides: Partial<ToolWiring> = {}): ToolWiring {
  return {
    id: "kpi-1",
    strategy: {
      kind: ERROR_MONITOR_STRATEGY_ENUM,
      id: "strategy-1",
    },
    configuration: {
      kind: "glitchtip",
      id: "cfg-1",
      url: "https://glitchtip.example",
      projectId: "42",
      organization: "uxco-group",
    },
    ...overrides,
  };
}

export function posthogWiring(overrides: Partial<ToolWiring> = {}): ToolWiring {
  return {
    id: "kpi-2",
    strategy: {
      kind: TRACKER_MONITOR_STRATEGY_ENUM,
      id: "strategy-2",
    },
    configuration: {
      kind: "posthog",
      id: "cfg-2",
      url: "https://eu.posthog.com",
      projectId: "9001",
    },
    ...overrides,
  };
}
