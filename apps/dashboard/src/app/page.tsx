import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { issuesDataAccess } from "./features/issues/data-access/IssuesDataAccess";
import { issuesKeys } from "./features/issues/queryKeys";
import { reservationsDataAccess } from "./features/reservations/data-access/ReservationsDataAccess";
import { reservationsKeys } from "./features/reservations/queryKeys";
import { errorRateDataAccess } from "./features/errorRate/data-access/ErrorRateDataAccess";
import { errorRateKeys } from "./features/errorRate/queryKeys";
import { visitorsTimelineDataAccess } from "./features/visitors/data-access/VisitorsTimelineDataAccess";
import { visitorsKeys } from "./features/visitors/queryKeys";
import { configDataAccess } from "./features/config/data-access/ConfigDataAccess";
import { configKeys } from "./features/config/queryKeys";
import { DashboardContent } from "./features/dashboard/ui/DashboardContent";
import { resolveDefaultEnvironment } from "./features/dashboard/state/environments";
import { presetsFromTimeInterval } from "./features/dashboard/state/windowPresets";
import {
  ERROR_MONITOR_STRATEGY_ENUM,
  LOG_MONITOR_STRATEGY_ENUM,
  TRACKER_MONITOR_STRATEGY_ENUM,
} from "@/lib/shared/strategiesEnum";

export const dynamic = "force-dynamic";

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_LIMIT = 20;

function ConfigMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
      <p>{children}</p>
    </main>
  );
}

export default async function Home() {
  const fallbackRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS;
  const environment = resolveDefaultEnvironment();

  const projects = await configDataAccess.getProjectsList();

  if (projects.length === 0) {
    return (
      <ConfigMessage>
        No project is configured in Strapi. Publish a project to display the
        dashboard.
      </ConfigMessage>
    );
  }

  const initialDocumentId = projects[0].documentId;
  const [initialConfig, panels] = await Promise.all([
    configDataAccess.getProjectConfig(initialDocumentId),
    configDataAccess.getProjectPanels(initialDocumentId),
  ]);

  const { presets: initialWindowPresets, initialWindowMinutes } =
    presetsFromTimeInterval(initialConfig?.timeInterval);

  const queryClient = new QueryClient();
  queryClient.setQueryData(configKeys.projects(), projects);
  queryClient.setQueryData(configKeys.project(initialDocumentId), initialConfig);
  queryClient.setQueryData(configKeys.pannels(initialDocumentId), panels);

  // Strapi returns the panels sorted by `order`, and PannelSelector selects the
  // first one when nothing is persisted yet. Prefetching under any other id
  // would build query keys the widgets never read.
  const initialPanel = panels?.[0];

  if (initialPanel) {
    const strategies = await configDataAccess.getProjectStrategies(
      initialDocumentId,
      initialPanel.slug,
    );

    queryClient.setQueryData(
      issuesKeys.isConfig(initialDocumentId, environment, initialPanel.slug),
      strategies,
    );

    // Mirror of the strategy mapping in DashboardContent: prefetching a widget
    // the panel does not map would resolve no factory and throw.
    const strategyNames = strategies?.map((strategy) => strategy.name) ?? [];
    const prefetches: Promise<void>[] = [];

    if (strategyNames.includes(ERROR_MONITOR_STRATEGY_ENUM)) {
      prefetches.push(
        queryClient.prefetchQuery({
          queryKey: issuesKeys.recent(initialPanel.id, DEFAULT_LIMIT, environment),
          queryFn: () =>
            issuesDataAccess.getRecent(initialPanel.id, DEFAULT_LIMIT, environment),
        }),
        queryClient.prefetchQuery({
          queryKey: errorRateKeys.series(initialPanel.id, environment),
          queryFn: () => errorRateDataAccess.getSeries(initialPanel.id, environment),
        }),
      );
    }

    if (strategyNames.includes(LOG_MONITOR_STRATEGY_ENUM)) {
      prefetches.push(
        queryClient.prefetchQuery({
          queryKey: reservationsKeys.series(
            initialPanel.id,
            initialWindowMinutes,
            environment,
          ),
          queryFn: () =>
            reservationsDataAccess.getSeries(
              initialPanel.id,
              initialWindowMinutes,
              environment,
            ),
        }),
      );
    }

    if (strategyNames.includes(TRACKER_MONITOR_STRATEGY_ENUM)) {
      prefetches.push(
        queryClient.prefetchQuery({
          queryKey: visitorsKeys.timeline(initialPanel.id, initialWindowMinutes),
          queryFn: () =>
            visitorsTimelineDataAccess.getSeries(initialPanel.id, initialWindowMinutes),
        }),
      );
    }

    await Promise.all(prefetches);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent
        initialDocumentId={initialDocumentId}
        initialWindowPresets={initialWindowPresets}
        initialWindowMinutes={initialWindowMinutes}
        limit={DEFAULT_LIMIT}
        fallbackRefreshIntervalMs={fallbackRefreshIntervalMs}
      />
    </HydrationBoundary>
  );
}
