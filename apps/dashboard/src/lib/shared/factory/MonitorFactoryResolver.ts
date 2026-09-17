import "server-only";

import type { ToolWiring } from "@/lib/config/domain/ToolWiring";
import { getErrorMonitorFactory } from "@/lib/errorMonitor/GetErrorMonitor";
import { getLogMonitor } from "@/lib/logMonitor/GetLogMonitor";
import { getTrackerMonitor } from "@/lib/trackerMonitor/GetTrackerMonitor";
import {
  ERROR_MONITOR_STRATEGY_ENUM,
  LOG_MONITOR_STRATEGY_ENUM,
  TRACKER_MONITOR_STRATEGY_ENUM,
} from "@/lib/shared/strategiesEnum";

const factories = {
  [ERROR_MONITOR_STRATEGY_ENUM]: getErrorMonitorFactory,
  [LOG_MONITOR_STRATEGY_ENUM]: getLogMonitor,
  [TRACKER_MONITOR_STRATEGY_ENUM]: getTrackerMonitor,
} as const;

export function resolveMonitorFactory(wiring: ToolWiring) {
  const strategy = wiring.strategy;

  if (!strategy) {
    throw new Error(
      `Strapi "${wiring.configuration?.projectId}" declares no strategy. Map one in admin.`,
    );
  }

  const factory = factories[strategy.kind]?.(wiring);

  if (!factory) {
    throw new Error(
      `Unsupported monitor strategy "${strategy.kind}".`,
    );
  }

  return factory;
}